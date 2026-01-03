from db.models import Institute, InstituteCampus, InstituteDepartment, InstituteTeam, User, Country, State, City
from db.db import SQLiteDB
from datetime import datetime
from sqlalchemy import text

def get_pagination(request):
    return (request.args.get('pageNumber', 1, type=int),
            request.args.get('pageSize', 10, type=int))

def insert_institute(data):
    name = data.get("name", None)
    short_name = data.get("short_name", None)
    industry_sector = data.get("industry_sector", None)
    industry_type = data.get("industry_type", None)
    primary_contact_person = data.get("primary_contact_person", None)
    primary_contact_email = data.get("primary_contact_email", None)
    primary_contact_phone = data.get("primary_contact_phone", None) 
    website = data.get("website", None)
    max_users = data.get("max_users", None)
    active_status = data.get("active_status", 1)

    subscription_start_str = data.get("subscription_start", None)
    subscription_end_str = data.get("subscription_end", None)
    created_by = data.get("current_user", 'system').get('user_id','system')

    subscription_start = None
    subscription_end = None
    date_format = "%Y-%m-%d"
    if subscription_start_str:
        try:
            subscription_start = datetime.strptime(subscription_start_str, date_format).date()
        except Exception:
            subscription_start = None
    if subscription_end_str:
        try:
            subscription_end = datetime.strptime(subscription_end_str, date_format).date()
        except Exception:
            subscription_end = None

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    new_inst = Institute(
        name=name,
        short_name=short_name,
        industry_sector = industry_sector,
        industry_type = industry_type,
        primary_contact_person = primary_contact_person,
        primary_contact_email = primary_contact_email,
        primary_contact_phone = primary_contact_phone,
        website = website,
        max_users = max_users,
        subscription_start = subscription_start,
        subscription_end = subscription_end,
        active_status=active_status,
        created_by=created_by,
    )
    try:
        session.add(new_inst)
        session.commit()
        institute_id = new_inst.institute_id

        head_office_data = data.get('headOffice',None)
        address = head_office_data.get('address', None)
        country_id = head_office_data.get('country', None)
        state_id = head_office_data.get('state', None)
        city_id = head_office_data.get('city', None)
        pin_code = head_office_data.get('pincode', None)
        email = head_office_data.get('email', None)
        phone = head_office_data.get('phone', None)
        is_primary = 1

        new_campus = InstituteCampus(
                institute_id=institute_id,
                name=short_name,
                address=address,
                country_id=country_id,
                state_id=state_id,
                city_id=city_id,
                pin_code=pin_code,
                email=email,
                phone=phone,
                is_primary=is_primary,
            )
        session.add(new_campus)
        session.commit()

        campuses_list = data.get('campuses', None)
        for campuses in campuses_list:
            name = campuses.get('name', None)
            address = campuses.get('address', None)
            country_id = campuses.get('country', None)
            state_id = campuses.get('state', None)
            city_id = campuses.get('city', None)
            pin_code = campuses.get('pincode', None)
            email = campuses.get('email', None)
            phone = campuses.get('phone', None)
            is_primary = 1 if campuses.get('isPrimary', None) == True else 0
            active_status = 1 if campuses.get('isActive', None) == True else 0

            new_campus = InstituteCampus(
                    institute_id=institute_id,
                    name=name,
                    address=address,
                    country_id=country_id,
                    state_id=state_id,
                    city_id=city_id,
                    pin_code=pin_code,
                    email=email,
                    phone=phone,
                    is_primary=is_primary,
                    active_status=active_status
                )
            session.add(new_campus)
            session.commit()

        for department in data.get('department'):
            new_InstituteDepartment = InstituteDepartment(
                institute_id=institute_id,
                name=department,
                created_by=created_by
            )
            session.add(new_InstituteDepartment)
            session.commit()

        for team in data.get('team'):
            new_InstituteTeam = InstituteTeam(
                institute_id=institute_id,
                name=team,
                created_by=created_by
            )
            session.add(new_InstituteTeam)
            session.commit()

        json_data = {
            "statusMessage": "Institute registered successfully",
            "status": True,
            "institute_id": institute_id
        }
        return json_data, 201
    except Exception as e:
        print(f"Error inserting institute: {e}")
        session.rollback()
        json_data = {
            "statusMessage": "Failed to register institute",
            "status": False
        }
        return json_data, 500

def update_institute(request):
    data = request.json
    institute_id = data.get("institute_id", None)
    if not institute_id:
        json_data = {
            "statusMessage": "institute_id is required",
            "status": False
        }
        return json_data, 400

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    institute = session.query(Institute).filter_by(institute_id=institute_id).first()
    if not institute:
        json_data = {
            "statusMessage": "Institute not found",
            "status": False
        }
        return json_data, 404

    # Update fields
    date_fields = ["subscription_start", "subscription_end"]
    date_format = "%Y-%m-%d"
    for key, value in data.items():
        if hasattr(institute, key) and key != "institute_id":
            if key in date_fields and isinstance(value, str) and value:
                try:
                    value = datetime.strptime(value, date_format).date()
                except Exception:
                    value = None
            setattr(institute, key, value)

    institute.updated_by = data.get("current_user", 'system')
    institute.updated_date = datetime.utcnow()

    # update departments if provided
    department_list = data.get('department', None)
    if department_list is not None:
        # Get existing department names for this institute
        existing_departments = session.query(InstituteDepartment).filter_by(institute_id=institute_id).all()
        existing_department_names = {dept.name for dept in existing_departments}
        for department in department_list:
            if department not in existing_department_names:
                new_InstituteDepartment = InstituteDepartment(
                    institute_id=institute_id,
                    name=department,
                    created_by=data.get("current_user", 'system')
                )
                session.add(new_InstituteDepartment)

    # update teams if provided
    team_list = data.get('team', None)
    if team_list is not None:
        # session.query(InstituteTeam).filter_by(institute_id=institute_id).delete()
        existing_teams = session.query(InstituteTeam).filter_by(institute_id=institute_id).all()
        existing_team_names = {team.name for team in existing_teams}
        for team in team_list:
            if team not in existing_team_names:
                new_InstituteTeam = InstituteTeam(
                    institute_id=institute_id,
                    name=team,
                    created_by=data.get("current_user", 'system')
                )
                session.add(new_InstituteTeam)

    # update campuses if provided
    campus_list = data.get('campuses', None)
    if campus_list is not None:
        # Fetch existing campuses for the institute
        existing_campuses = session.query(InstituteCampus).filter_by(institute_id=institute_id).all()
        existing_campus_ids = {campus.campus_id for campus in existing_campuses}
        # Build a set of campus_ids from the incoming list (if present)
        incoming_campus_ids = set()
        for campus in campus_list:
            campus_id = campus.get('campus_id')
            if campus_id:
                incoming_campus_ids.add(campus_id)

        # Delete campuses that are not in the incoming list
        for campus in existing_campuses:
            if campus.campus_id not in incoming_campus_ids:
                session.delete(campus)

        # Update or insert campuses
        for campus in campus_list:
            campus_id = campus.get('campus_id')
            if campus_id and campus_id in existing_campus_ids:
            # Update existing campus
                existing_campus = session.query(InstituteCampus).filter_by(campus_id=campus_id, institute_id=institute_id).first()
                if existing_campus:
                    existing_campus.name = campus.get('name')
                    existing_campus.address = campus.get('address')
                    existing_campus.country_id = campus.get('country')
                    existing_campus.state_id = campus.get('state')
                    existing_campus.city_id = campus.get('city')
                    existing_campus.pin_code = campus.get('pincode')
                    existing_campus.email = campus.get('email')
                    existing_campus.phone = campus.get('phone')
                    existing_campus.is_primary = campus.get('isPrimary', False)
                    existing_campus.active_status = campus.get('isActive', True)
                    existing_campus.updated_by = data.get("current_user", 'system')
                    existing_campus.updated_date = datetime.utcnow()
            else:
                # Insert new campus
                new_InstituteCampus = InstituteCampus(
                    institute_id=institute_id,
                    name=campus.get('name'),
                    address=campus.get('address'),
                    country_id=campus.get('country'),
                    state_id=campus.get('state'),
                    city_id=campus.get('city'),
                    pin_code=campus.get('pincode'),
                    email=campus.get('email'),
                    phone=campus.get('phone'),
                    is_primary=campus.get('isPrimary', False),
                    active_status=campus.get('isActive', True),
                    created_by=data.get("current_user", 'system')
                )
                session.add(new_InstituteCampus)

    try:
        session.commit()
        json_data = {
            "statusMessage": "Institute updated successfully",
            "status": True
        }
        return json_data, 200
    except Exception as e:
        print(f"Error updating institute: {e}")
        session.rollback()
        json_data = {
            "statusMessage": "Failed to update institute",
            "status": False
        }
        return json_data, 500

def manage_institute(action, uuid, updated_by):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    active_status = 1 if action == "activate" else 0
    # update institute table 
    institute = session.query(Institute).filter_by(institute_id=uuid).first()
    if not institute:
        return {"statusMessage": "Institute not found", "status": False}, 404
    if action == 'delete':
        return {"statusMessage": "Insititue record deleted", "ststus": True}, 200

    institute.active_status = active_status
    institute.updated_by = updated_by
    institute.updated_date = datetime.utcnow()
    session.commit()

    return {"statusMessage": f"Institute {'activated' if active_status else 'deactivated'} successfully", "status": True}, 200


def get_institute_details(request):
    
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    page_number, page_size = get_pagination(request)
    filters = []
    args = getattr(request, "args", {})
    if args.get("name"):
        filters.append(Institute.name.ilike(f"%{args.get('name')}%"))
    if args.get("industry"):
        filters.append(Institute.industry_type.ilike(f"%{args.get('industry')}%"))
    if args.get("sector"):
        filters.append(Institute.industry_sector.ilike(f"%{args.get('sector')}%"))
    if args.get("active_status") is not None:
        filters.append(Institute.active_status == (1 if args.get("active_status") == 'true' else 0))
    if args.get("country"):
        country_val = args.get("country")
        if country_val is not None:
            if isinstance(country_val, (list, tuple)):
                filters.append(InstituteCampus.country_id.in_(country_val))
            else:
                filters.append(InstituteCampus.country_id.in_([country_val]))
    if args.get("city"):
        city_val = args.get("city")
        if city_val is not None:
            if isinstance(city_val, (list, tuple)):
                filters.append(InstituteCampus.city_id.in_(city_val))
            else:
                filters.append(InstituteCampus.city_id.in_([city_val]))

    # If country or city filters are present, join with InstituteCampus
    if any(arg in args for arg in ["country", "city"]):
        query = (
            session.query(Institute)
            .join(InstituteCampus, Institute.institute_id == InstituteCampus.institute_id)
            .filter(*filters)
            .distinct()
        )
        total_count = query.count()
        institutes = query.offset((page_number - 1) * page_size).limit(page_size).all()
    else:
        query = session.query(Institute).filter(*filters)
        total_count = query.count()
        institutes = query.offset((page_number - 1) * page_size).limit(page_size).all()
    
    result = []
    for inst in institutes:
        # get InstituteDepartments details
        departments = session.query(InstituteDepartment).filter_by(institute_id=inst.institute_id).all()
        dept_list = []
        for dept in departments:
            dept_list.append({
                "dept_id": dept.department_id,
                "name": dept.name,
                "active_status": True if dept.active_status else False,
            })
        # Get InstituteTeams details
        teams = session.query(InstituteTeam).filter_by(institute_id=inst.institute_id).all()
        team_list = []
        for team in teams:
            team_list.append({
                "team_id": team.team_id,
                "name": team.name,
                "active_status": True if team.active_status else False,
            })
        #  Get InstituteCampuses details
        campuses = session.query(InstituteCampus).filter_by(institute_id=inst.institute_id).all()
        campus_list = []
        for campus in campuses:
            # Fetch country, state, and city names if possible
            country_name = None
            state_name = None
            city_name = None

            if campus.country_id:
                country = session.query(Country).filter_by(country_id=campus.country_id).first()
                country_name = country.country_name if country else None

            if campus.state_id:
                state = session.query(State).filter_by(state_id=campus.state_id).first()
                state_name = state.state_name if state else None

            if campus.city_id:
                city = session.query(City).filter_by(city_id=campus.city_id).first()
                city_name = city.city_name if city else None

            campus_list.append({
            "campus_id": campus.campus_id,
            "name": campus.name,
            "address": campus.address,
            "country": {"country_id": campus.country_id,"country_name": country_name,},
            "state": {"state_id": campus.state_id,"state_name": state_name,},
            "city": {"city_id": campus.city_id,"city_name": city_name,},
            "pin_code": campus.pin_code,
            "email": campus.email,
            "phone": campus.phone,
            "is_primary": True if campus.is_primary else False,
            "active_status": True if campus.active_status else False,
            })
        created_by = None
        updated_by = None
        if inst.created_by:
            created_by = session.query(User).filter_by(user_id=inst.created_by).first()
            created_by = created_by.full_name if created_by else None
        if inst.updated_by:
            updated_by = session.query(User).filter_by(user_id=inst.updated_by).first()
            updated_by = updated_by.full_name if updated_by else None
        result.append({
            "institute_id": inst.institute_id,
            "name": inst.name,
            "short_name": inst.short_name,
            "primary_contact_person": inst.primary_contact_person,
            "primary_contact_email": inst.primary_contact_email,
            "primary_contact_phone": inst.primary_contact_phone,
            "website": inst.website,
            "industry_type": inst.industry_type,
            "industry_sector": inst.industry_sector,
            "max_users": inst.max_users,
            "subscription_start": inst.subscription_start,
            "subscription_end": inst.subscription_end,
            "active_status": True if inst.active_status else False,
            "departments": dept_list,
            "teams": team_list,
            "campuses": campus_list,
            "created_by": {"user_id": inst.created_by, "user_name" :created_by},
            "created_date": inst.created_date,
            "updated_by":{ "user_id": inst.updated_by, "user_name" : updated_by},
            "updated_date": inst.updated_date
        })
    json_data = {
        "statusMessage": "Institutes retrieved successfully",
        "status": True,
        "data": result,
        "total": len(result),
        "totalCount": total_count
    }
    return json_data , 200

def get_institute_list():
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    # get active institutes list
    active_institutes = session.query(Institute).filter_by(active_status=1).all()
    result = []
    for inst in active_institutes:
        result.append({
            "institute_id": inst.institute_id,
            "short_name": inst.short_name
        })
    json_data = {
        "statusMessage": "Active institutes retrieved successfully",
        "status": True,
        "data": result,
        "total": len(result)
    }
    return json_data, 200

def get_campus_list(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    institute_id = request.args.get('institute_id', None)
    if not institute_id:
        json_data = {
            "statusMessage": "institute_id parameter is required",
            "status": False
        }
        return json_data, 400

    campuses = session.query(InstituteCampus).filter_by(institute_id=institute_id).all()
    result = []
    for campus in campuses:
        result.append({
            "campus_id": campus.campus_id,
            "name": campus.name
        })
    json_data = {
        "statusMessage": "Campuses retrieved successfully",
        "status": True,
        "data": result,
        "total": len(result)
    }
    return json_data, 200