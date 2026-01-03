# from django import db
from db.models import Institute, User, AppSession, Credential

import datetime
import re
import jwt
import requests
import base64
import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from passlib.hash import argon2
import pandas as pd

from db.db import SQLiteDB

class JWTValidator:
    def __init__(self, jwt_secret, issuer=None, audience=None):
        self.jwt_secret = jwt_secret
        self.tenant_id = issuer
        self.audience = audience
        if issuer:
            self.issuer = f"https://sts.windows.net/{issuer}/"
        else:
            self.issuer = issuer
    # Convert query result to DataFrame with headers
    def query_result_to_dataframe(self, cursor, data):
        if data is None:
            return pd.DataFrame()
        columns = [desc[0] for desc in cursor.description]
        if isinstance(data, (list, tuple)) and not isinstance(data, dict):
            # Single row
            return pd.DataFrame([data], columns=columns)
        elif isinstance(data, dict):
            return pd.DataFrame([data])
        else:
            return pd.DataFrame()

    def generate_jwt(self, subject, expires_in_seconds=1800, additional_claims=None):

        now = datetime.datetime.utcnow()
        payload = {
            "sub": subject,
            "iat": now,
            "exp": now + datetime.timedelta(seconds=expires_in_seconds)
        }

        if self.audience:
            payload["aud"] = self.audience
        if self.issuer:
            payload["iss"] = self.issuer
        if additional_claims:
            payload.update(additional_claims)

        token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
        return token
    def get_public_keys(self):
        try:
            JWK_URL = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
            response = requests.get(JWK_URL)
            response.raise_for_status()
            return response.json()['keys']
        except requests.exceptions.RequestException as e:
            print(f"Error fetching public keys: {e}", flush=True)
            return []

    def jwk_to_pem(self, jwk):
        def base64url_decode(input):
            input += '=' * (4 - len(input) % 4)
            return base64.urlsafe_b64decode(input)

        public_key = rsa.RSAPublicNumbers(n=int.from_bytes(base64url_decode(jwk['n']), 'big'),
            e=int.from_bytes(base64url_decode(jwk['e']), 'big')).public_key(default_backend())
        pem = public_key.public_bytes(encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem    
    def validate_jwt(self, token):
        try:
            # Construct options dict to disable validation if not provided
            options = {}
            if not self.audience:
                options["verify_aud"] = False
            if not self.issuer:
                options["verify_iss"] = False
            if not self.jwt_secret:
                public_keys = self.get_public_keys()
                unverified_header = jwt.get_unverified_header(token)
                for key in public_keys:
                    if key["kid"] == unverified_header["kid"]:
                        self.jwt_secret = self.jwk_to_pem(key)
                        break
            decoded_token = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience=self.audience,
                issuer=self.issuer,
                options=options
            )
            return decoded_token
        except jwt.ExpiredSignatureError:
            print("Token has expired", flush=True)
            raise
        except jwt.InvalidTokenError as e:
            print("Invalid token", flush=True)
            raise

    def token_validation(self, request):
        auth_header = request.headers.get("Authorization")

        if auth_header is None:
            return "Authorization header is missing"

        if not re.match(r"^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$", auth_header):
            return "Invalid Authorization header format. Expected format: 'Bearer <token>'"

        try:
            token = auth_header.split(" ")[1]
            self.validate_jwt(token)
            return "Access granted"
        except Exception as e:
            return str(e)

    def login(self,data):
        db = SQLiteDB()
        session = db.connect()

        email = data.get('email')
        password = data.get('password')

        user = session.query(User).filter_by(email=email).first()
        if not user:
            json_data ={
                "statusMessage": "User not found",
                "status": False
            }

            return json_data, 404
        cred = session.query(Credential).filter_by(user_id=user.user_id).first()
        if not cred or not argon2.verify(password, cred.password_hash):
            json_data = {
                "statusMessage": "Invalid password",
                "status": False
            }

            return json_data, 401

        institute = session.query(Institute).filter_by(institute_id=user.institute_id).first()

        token = self.generate_jwt(user.email)
        session_data = AppSession(user_id=user.user_id, token=token)
        session.add(session_data)
        session.commit()

        json_data = {
            "statusMessage": "Login successful",
            "user": {
                'user_id': user.user_id,
                'name': user.full_name,
                'username': user.user_name,
                'email':user.email,
                'institute': institute.name,
                'institute_short_name': institute.short_name,
                'institute_id': user.institute_id,
                'role': user.user_role
            },
            "status": True,
            "token": token
        }

        return json_data, 200

    def refresh_token(self, request):
        try:

            user_id = request.json.get('user_id')
            if not user_id:
                return {"status": False, "statusMessage": "user_id missing"}, 401

            db = SQLiteDB()
            session = db.connect()
            session_row = session.query(AppSession).filter_by(user_id=user_id).first()
            if not session_row:
                return {"status": False, "statusMessage": "Session not found"}, 401
            user = session.query(User).filter_by(user_id=user_id).first()
            if not user:
                return {"status": False, "statusMessage": "User not found"}, 404

            # issue a new token and update AppSession
            new_token = self.generate_jwt(user.email)
            session_row.token = new_token
            session_row.expires_at = None
            session.commit()

            json_data = {
                "status": True,
                "statusMessage": "Token refreshed",
                "token": new_token,
                "user": {
                    'user_id': user.user_id,
                    'name': user.full_name,
                    'username': user.user_name,
                    'email': user.email,
                    'institute': session.query(Institute).filter_by(institute_id=user.institute_id).first().name if user.institute_id else None,
                    'institute_id': user.institute_id,
                    'role': user.user_role
                }
            }
            return json_data, 200
        except Exception as e:
            return {"status": False, "statusMessage": str(e)}, 500
    
    def logout(self, data):
        try:
            db = SQLiteDB()
            session = db.connect()
            user_id = data.get('user_id')
            
            session_data = session.query(AppSession).filter_by(user_id=user_id).all()
            for s in session_data:
                session.delete(s)
            session.commit()
            return {"status": True, "message": "Logout successful"}, 200
        except Exception as e:
            return {"status": False, "message": str(e)}, 500