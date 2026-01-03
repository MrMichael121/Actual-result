from db.models import InstituteDepartment, InstituteTeam
from db.db import SQLiteDB

def get_institute_department_details(institute_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:
        if institute_id:
            departments = session.query(InstituteDepartment).filter_by(institute_id=institute_id).all()
        else:
            departments = session.query(InstituteDepartment).all()
        json_data = []
        for department in departments:
            json_data.append({
                "id": department.department_id,
                "name": department.name
            })
        json_data = {
            "statusMessage": "Institute department details fetched successfully",
            "status": True,
            "data": json_data
        }
        return json_data, 200
    except Exception as e:
        print(f"Error fetching institute department details: {e}")
        json_data = {
            "statusMessage": "Institute department details not found",
            "status": False
        }
        return json_data, 404
    finally:
        session.close()

def get_institute_team_details(institute_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:
        if institute_id:
            teams = session.query(InstituteTeam).filter_by(institute_id=institute_id).all()
        else:
            teams = session.query(InstituteTeam).all()
        json_data = []
        for team in teams:
            json_data.append({
                "id": team.team_id,
                "name": team.name
            })
        json_data = {
            "statusMessage": "User details fetched successfully",
            "status": True,
            "data": json_data
        }
        return json_data, 200
    except Exception as e:
        print(f"Error fetching institute team details: {e}")
        json_data = {
            "statusMessage": "Institute team details not found",
            "status": False
        }
        return json_data, 404
    finally:
        session.close()