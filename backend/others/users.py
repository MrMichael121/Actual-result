import pandas as pd
from db.models import User, Institute, InstituteDepartment, InstituteTeam,InstituteCampus
from db.models import Credential, UserPageAccess, Page, Country, State,City
from db.db import SQLiteDB
from datetime import datetime
from passlib.hash import argon2
def get_pagination(request):
    return (request.args.get('pageNumber', 1, type=int),
            request.args.get('pageSize', 25, type=int))

def insert_user(data):
    full_name = data.get("display_name", None)
    user_name = data.get("user_name",None)
    email = data.get("email", None)
    user_role = data.get("user_role",None)
    institute_id = data.get("institute_id", None)
    contact_no = data.get("contact_no", None)
    active_status = 1 if data.get("active_status", None) == True else 0
    password =  data.get('password' , None)
    department_id = data.get("department_id", None)
    team_id = data.get("team_id", None)
    campus_id = data.get("campus_id", None)
    country_id = data.get("country_id", None)
    state_id = data.get("state_id", None)
    city_id = data.get("city_id", None)
    joining_date = data.get("joining_date", None)
    joining_date = datetime.strptime(joining_date, "%Y-%m-%d").date()
    created_by = data.get("created_by", "Admin")

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    new_user = User(
        full_name = full_name,
        user_name=user_name,
        email=email,
        user_role=user_role,
        institute_id= institute_id,
        contact_no =contact_no,
        active_status =active_status,
        department_id = department_id,
        team_id = team_id,
        campus_id = campus_id,
        country_id = country_id,
        state_id = state_id,
        city_id = city_id,
        joining_date = joining_date,
        created_by = created_by

    )
    try:
        session.add(new_user)
        session.commit()
        user_id = new_user.user_id

        # add data in UserPageAccess for user-management
        page_data = data.get('page_access', [])
        for page_access in page_data:
            user_page_access = UserPageAccess(
                user_id=user_id,
                page_id=page_access.get('page_key'),
                can_view=page_access.get('view', False),
                can_add=page_access.get('add', False),
                can_edit=page_access.get('edit', False),
                can_delete=page_access.get('delete', False)
            )
            session.add(user_page_access)
        session.commit()

        password_hash = argon2.hash(password)
        # insert credentials
        cred_data = Credential(
            user_id=user_id,
            password_hash=password_hash
        )
        session.add(cred_data)
        session.commit()

        json_data = {
            "statusMessage": "User registered successfully",
            "status": True,
            "user_id": user_id
        }
        return json_data, 201
    except Exception as e:
        print(f"Error inserting user: {e}")
        session.rollback()
        json_data = {
            "statusMessage": "Failed to register user",
            "status": False
        }
        return json_data, 500

def user_bulk_upload(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    
    institute_id = request.form.get("institute_id", None)
    # get file from request
    file = request.files.get("file", None)
    if not file:
        return {"statusMessage": "No file provided", "status": False}, 400
    # read file using pandas
    df = pd.read_csv(file)
    active_status = 1

    # Get Page table data
    page_data = session.query(Page).all()

    error_users_list = []

    for index, row in df.iterrows():
        full_name = row.get("full_name", None)
        user_name = row.get("username", None)
        email = row.get("email", None)
        user_role = row.get("role", None)
        contact_no = row.get("contact_no", None)
        password = row.get('password', "User@12321")
        department = row.get("department", None)
        team = row.get("team", None)
        campus = row.get("campus", None)
        country = row.get("country", None)
        state = row.get("state", None)
        city = row.get("city", None)
        joining_date = row.get("joining_date", None)
        joining_date = datetime.strptime(joining_date, "%y-%m-%Y").date() if joining_date else None

        # Get department_id from InstituteDepartment
        department_data = session.query(InstituteDepartment).filter(
            InstituteDepartment.institute_id == institute_id,
            InstituteDepartment.name.ilike(f"%{department}%")
        ).first()
        department_id = department_data.department_id if department_data else None

        # Get team_id from InstituteTeam
        team_data = session.query(InstituteTeam).filter(
            InstituteTeam.institute_id == institute_id,
            InstituteTeam.name.ilike(f"%{team}%")
        ).first()
        team_id = team_data.team_id if team_data else None

        # Get campus_id from InstituteCampus
        campus_data = session.query(InstituteCampus).filter(
            InstituteCampus.institute_id == institute_id,
            InstituteCampus.name.ilike(f"%{campus}%")
        ).first()
        campus_id = campus_data.campus_id if campus_data else None

        # Get country_id from Country
        country_data = session.query(Country).filter(
            Country.country_name.ilike(f"%{country}%")
        ).first()
        country_id = country_data.country_id if country_data else None

        # Get state_id from State
        state_data = session.query(State).filter(
            State.state_name.ilike(f"%{state}%")
        ).first()
        state_id = state_data.state_id if state_data else None

        # Get city_id from City
        city_data = session.query(City).filter(
            City.city_name.ilike(f"%{city}%")
        ).first()
        city_id = city_data.city_id if city_data else None

        created_by = "Admin"

        try:
            new_user = User(
            full_name = full_name,
            user_name=user_name,
            email=email,
            user_role=user_role,
            institute_id= institute_id,
            contact_no =contact_no,
            active_status =active_status,
            department_id = department_id,
            team_id = team_id,
            campus_id = campus_id,
            country_id = country_id,
            state_id = state_id,
            city_id = city_id,
            joining_date = joining_date,
            created_by = created_by
            )
        
            session.add(new_user)
            session.flush()
            user_id = new_user.user_id

            if user_role == 'admin':
                for page_access in page_data:
                    user_page_access = UserPageAccess(
                        user_id=user_id,
                        page_id=page_access.page_id,
                        can_view= True,
                        can_add=True,
                        can_edit= True,
                        can_delete= True
                    )
                    session.add(user_page_access)
                session.flush()

            password_hash = argon2.hash(password)
            # insert credentials
            cred_data = Credential(
                user_id=user_id,
                password_hash=password_hash
            )
            session.add(cred_data)
            session.commit()
        except Exception as e:
            error_users_list.append(user_name)
            session.rollback()

    if error_users_list:
        json_data ={
            "status": False,
            "statusMessage": f"Failed to register users: {', '.join(error_users_list)}"
        }

    json_data = {
        "statusMessage": "User registered successfully",
        "status": True,
    }
    return json_data, 200

def update_user_details(user_id, request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    data = request.json

    user = session.query(User).filter_by(user_id=user_id).first()
    if not user:
        json_data = {
            "statusMessage": "User not found",
            "status": False
        }
        return json_data, 404
    
    # Update user details based on the provided data
    date_fields = ['joining_date', 'created_date', 'updated_date']
    for field in date_fields:
        if field in data and data[field]:
            data[field] = datetime.strptime(data[field], "%Y-%m-%d").date()
    for key, value in data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    user.updated_by = data.get("current_user", 'system')
    user.updated_date = datetime.utcnow()

    # update user privileges
    page_data = data.get('page_access', [])
    for page_access in page_data:
        user_page_access = session.query(UserPageAccess).filter_by(
            user_id=user_id,
            page_id=page_access.get('page_key')
        ).first()
        if user_page_access:
            user_page_access.can_view = page_access.get('view', user_page_access.can_view)
            user_page_access.can_add = page_access.get('add', user_page_access.can_add)
            user_page_access.can_edit = page_access.get('edit', user_page_access.can_edit)
            user_page_access.can_delete = page_access.get('delete', user_page_access.can_delete)
        else:
            new_access = UserPageAccess(
                user_id=user_id,
                page_id=page_access.get('page_key'),
                can_view=page_access.get('view', False),
                can_add=page_access.get('add', False),
                can_edit=page_access.get('edit', False),
                can_delete=page_access.get('delete', False)
            )
            session.add(new_access)
    try:
        session.commit()
        json_data = {
            "statusMessage": "User updated successfully",
            "status": True
        }
        return json_data, 200
    except Exception as e:
        session.rollback()
        json_data = {
            "statusMessage": f"Failed to update user: {str(e)}",
            "status": False
        }
        return json_data, 500

def get_user_details(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    page_number, page_size = get_pagination(request)
    filter = []
    args = getattr(request, "args", {})
    if args.get("institute_id"):
        filter.append(User.institute_id == args.get("institute_id"))
    if args.get("department"):
        filter.append(User.department_id == args.get("department"))
    if args.get("team"):
        filter.append(User.team_id == args.get("team"))
    if args.get("name"):
        filter.append(User.full_name.ilike(f"%{args.get('name')}%"))
    if args.get("active_status") is not None:
        filter.append(User.active_status == (1 if args.get("active_status") == 'true' else 0))
    if args.get("campus"):
        filter.append(User.campus_id == args.get("campus"))
    if args.get("country"):
        filter.append(User.country_id == args.get("country"))
    if args.get("city"):
        filter.append(User.city_id == args.get("city"))

    user_details = session.query(User).filter(*filter).offset((page_number - 1) * page_size).limit(page_size).all()
    total_count = session.query(User).filter(*filter).count()
    
    result = []
    for user in user_details:
        # Fetch institute_name based on institute_id
        institute_name = None
        if user.institute_id:
            institute = session.query(Institute).filter_by(institute_id=user.institute_id).first()
            if institute:
                institute_name = institute.name

        department_name = None
        if user.department_id:
            department = session.query(InstituteDepartment).filter_by(department_id=user.department_id).first()
            if department:
                department_name = department.name

        team_name = None
        if user.team_id:
            team = session.query(InstituteTeam).filter_by(team_id=user.team_id).first()
            if team:
                team_name = team.name
        # get campus 
        campus_name = None
        if user.campus_id:
            campus = session.query(InstituteCampus).filter_by(campus_id=user.campus_id).first()
            if campus:
                campus_name = campus.name
        # get countrt, state and city data also
        country_name = None
        if user.country_id:
            country = session.query(Country).filter_by(country_id=user.country_id).first()
            if country:
                country_name = country.country_name
        
        state_name = None
        if user.state_id:
            state = session.query(State).filter_by(state_id=user.state_id).first()
            if state:
                state_name = state.state_name

        city_name = None
        if user.city_id:
            city = session.query(City).filter_by(city_id=user.city_id).first()
            if city:
                city_name = city.city_name

        # get created user details
        created_user_name = None
        if user.created_by:
            created_user = session.query(User).filter_by(user_id=user.created_by).first()
            if created_user:
                created_user_name = created_user.full_name
        # updated user details
        updated_user_name = None
        if user.updated_by:
            updated_user = session.query(User).filter_by(user_id=user.updated_by).first()
            if updated_user:
                updated_user_name = updated_user.full_name

        user_page_accesses = session.query(UserPageAccess).filter_by(user_id=user.user_id).all()
        page_access_list = []
        for access in user_page_accesses:
            page = session.query(Page).filter_by(page_id=access.page_id).first()
            page_name = page.page_name if page else None
            page_access_list.append({
                "page_id": access.page_id,
                "page_name": page_name,
                "can_view": access.can_view,
                "can_add": access.can_add,
                "can_edit": access.can_edit,
                "can_delete": access.can_delete
            })
        user_info = {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "user_name": user.user_name,
            "user_role": user.user_role,
            "institute": {
                "institute_id": user.institute_id,
                "institute_name": institute_name,
            },
            "department": {"department_id": user.department_id, "department_name": department_name},
            "team": {"team_id": user.team_id, "team_name": team_name},
            "campus": {"campus_id": user.campus_id, "campus_name": campus_name},
            "country": {"country_id": user.country_id, "country_name": country_name},
            "state": {"state_id": user.state_id, "state_name": state_name},
            "city": {"city_id": user.city_id, "city_name": city_name},
            "user_privileges": page_access_list,
            "email": user.email,
            "contact_no": user.contact_no,
            "joining_date": user.joining_date.strftime("%d-%m-%Y") if user.joining_date else None,
            "active_status": True if user.active_status else False,
            "created_by": created_user_name,
            "created_date": user.created_date.strftime("%d-%m-%Y") if user.created_date else None,
            "updated_by": updated_user_name,
            "updated_date": user.updated_date.strftime("%d-%m-%Y") if user.updated_date else None
        }
        result.append(user_info)
    json_data = {
        "statusMessage": "User details fetched successfully",
        "status": True,
        "data": result,
        "total": len(result),
        "totalCount": total_count
    }
    return json_data, 200

def get_user_list(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    filter = []
    args = getattr(request, "args", {})
    if args.get("institute_id"):
        filter.append(User.institute_id == args.get("institute_id"))
    if args.get("department_id"):
        filter.append(User.department_id == args.get("department_id"))
    if args.get("team_id"):
        filter.append(User.team_id == args.get("team_id"))
    if args.get("name"):
        filter.append(User.full_name.ilike(f"%{args.get('name')}%"))
    if args.get("active_status") is not None:
        filter.append(User.active_status == (1 if args.get("active_status") == 'true' else 0))
    if args.get("campus_id"):
        filter.append(User.campus_id == args.get("campus_id"))

    user_details = session.query(User).filter(*filter).all()
    result = []
    for user in user_details:
        # Fetch institute_name based on institute_id
        institute_name = None
        if user.institute_id:
            institute = session.query(Institute).filter_by(institute_id=user.institute_id).first()
            if institute:
                institute_name = institute.name
        # Fetch department_name based on department_id
        department_name = None
        if user.department_id:
            department = session.query(InstituteDepartment).filter_by(department_id=user.department_id).first()
            if department:
                department_name = department.name
        # Fetch team_name based on team_id
        team_name = None
        if user.team_id:
            team = session.query(InstituteTeam).filter_by(team_id=user.team_id).first()
            if team:
                team_name = team.name
        user_info = {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "user_name": user.user_name,
            "user_role": user.user_role,
            "institute": {"institute_id": user.institute_id,"institute_name": institute_name,},
            "department": {"department_id": user.department_id, "department_name": department_name},
            "team": {"team_id": user.team_id, "team_name": team_name},
            "email": user.email,
            "active_status": True if user.active_status else False
        }
        result.append(user_info)
    json_data = {
        "statusMessage": "User details fetched successfully",
        "status": True,
        "data": result,
        "total": len(result)
    }
    return json_data, 200

def get_user_limit(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    args = getattr(request, "args", {})
    institute_id = args.get("institute_id")

    max_user_limit = session.query(Institute).filter_by(institute_id=institute_id).first().max_users

    already_assigned = session.query(User).filter_by(institute_id=institute_id, active_status=1).count()
    available_licenses = max_user_limit - already_assigned

    json_data = {
       "statusMessage": "User limit fetched successfully",
       "status": True,
       "data": {
       "max_user_limit": max_user_limit,
       "available_licenses": available_licenses,
       "already_assigned": already_assigned,}
       }
    return json_data, 200

def get_user_page_access(user_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    #  get details from Page, UserPageAccess
    access_details = session.query(
        Page.page_id,
        Page.page_name,
        UserPageAccess.can_view,
        UserPageAccess.can_add,
        UserPageAccess.can_edit,
        UserPageAccess.can_delete
    ).outerjoin(
        UserPageAccess,
        (UserPageAccess.page_id == Page.page_id) & (UserPageAccess.user_id == user_id)
    ).all()

    result = []
    for access in access_details:
        result.append({
            "page_id": access.page_id,
            "page_name": access.page_name,
            "can_view": access.can_view if access.can_view is not None else False,
            "can_add": access.can_add if access.can_add is not None else False,
            "can_edit": access.can_edit if access.can_edit is not None else False,
            "can_delete": access.can_delete if access.can_delete is not None else False
        })

    json_data = {
        "statusMessage": "User page access fetched successfully",
        "status": True,
        "data": result
    }
    return json_data, 200

def manage_user(action, uuid, updated_by):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    if action not in ["activate", "deactivate"]:
        return {"statusMessage": f"Invalid action '{action}'. Use 'activate' or 'deactivate'.", "status": False}, 400
    active_status = 1 if action == "activate" else 0
    user = session.query(User).filter_by(user_id=uuid).first()
    if not user:
        return {"statusMessage": "User not found", "status": False}, 404
    user.active_status = active_status
    user.updated_by = updated_by
    user.updated_date = datetime.utcnow()
    session.commit()
    return {"statusMessage": f"User {'activated' if active_status else 'deactivated'} successfully", "status": True}, 200
