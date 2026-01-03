from db.models import Categories, CategoriesDepartments, CategoriesTeams, Institute,User
from db.db import SQLiteDB
from datetime import datetime

def get_categories_list(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    filter = []
    args = getattr(request, "args", {})
    if args.get("institute_id"):
        filter.append(Categories.institute_id == args.get("institute_id"))
    categories = session.query(Categories).filter(*filter).all()
    categories_list =[]
    for category in categories:
        categories_list.append({
            "id": category.category_id,
            "name": category.name,
            "description": category.description
        })
    json_data = {
        "statusMessage": "Categories retrieved successfully",
        "status": True,
        "data": categories_list
    }
    return json_data, 200

def get_category_details(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    filter = []
    args = getattr(request, "args", {})
    if args.get("institute_id"):
        filter.append(Categories.institute_id == args.get("institute_id"))
    if args.get("departments"):
        departments = args.get("departments").split(",")
        filter.append(CategoriesDepartments.department_id.in_(departments))
    if args.get("teams"):
        teams = args.get("teams").split(",")
        filter.append(CategoriesTeams.team_id.in_(teams))
    if args.get("name"):
        filter.append(Categories.name.ilike(f"%{args.get('name')}%"))
    if args.get("active_status") is not None:
        filter.append(Categories.active_status == (1 if args.get("active_status") == 'true' else 0))
    if args.get("public_access") is not None:
        filter.append(Categories.public_access == (1 if args.get("public_access") == 'true' else 0))
    if args.get("created_by") is not None:
        filter.append(Categories.created_by == args.get("created_by"))
    if args.get("created_after"):
        filter.append(Categories.created_date >= args.get("created_after"))
    if args.get("created_before"):
        filter.append(Categories.created_date <= args.get("created_before"))

    if args.get("departments"):
        category_details = session.query(Categories).join(CategoriesDepartments, Categories.category_id == CategoriesDepartments.category_id).filter(*filter).all()
    elif args.get("teams"):
        category_details = session.query(Categories).join(CategoriesTeams, Categories.category_id == CategoriesTeams.category_id).filter(*filter).all()
    else:
        category_details = session.query(Categories).filter(*filter).all()
    result = []
    for category in category_details:
        # Fetch institute_name based on institute_id
        institute_name = None
        if category.institute_id:
            institute = session.query(Institute).filter_by(institute_id=category.institute_id).first()
            if institute:
                institute_name = institute.name
        # Fetch department_name based on department_id
        department_details = {}
        if category.category_id:
            department = session.query(CategoriesDepartments).filter_by(category_id=category.category_id).all()
            if department:
                for dept in department:
                    department_details[dept.id] = dept.name
            # Fetch team_name based on team_id
            team_details = {}
            team = session.query(CategoriesTeams).filter_by(category_id=category.category_id).all()
            if team:
                for t in team:
                    team_details[t.id] = t.name
        # get created_by and updated_by names
        created_by_name = None
        updated_by_name = None
        if category.created_by:
            created_by = session.query(User).filter_by(user_id=category.created_by).first()
            if created_by:
                created_by_name = created_by.full_name
        if category.updated_by:
            updated_by = session.query(User).filter_by(user_id=category.updated_by).first()
            if updated_by:
                updated_by_name = updated_by.full_name

        category_info = {
            "category_id": category.category_id,
            "name": category.name,
            "description": category.description,
            "institute": {
                "institute_id": category.institute_id,
                "institute_name": institute_name,
            },
            "type": category.type,
            "answer_by": category.answer_by,
            "evaluation": category.evaluation,
            "mark_each_question": category.mark_each_question,
            "departments": department_details,
            "teams": team_details,
            "active_status": True if category.active_status else False,
            "public_access": True if category.public_access else False,
            "created_by": created_by_name,
            "created_date": category.created_date,
            "updated_by": updated_by_name,
            "updated_date": category.updated_date
        }
        result.append(category_info)
    json_data = {
        "statusMessage": "Category details fetched successfully",
        "status": True,
        "data": result,
        "total": len(result)
    }
    return json_data, 200

def add_categories(request):
    db = SQLiteDB()
    session = db.connect()
    category_data = request.get_json()
    new_category = Categories(
        name=category_data.get("name"),
        description=category_data.get("description"),
        institute_id=category_data.get("institute_id"),
        type=category_data.get("type"),
        answer_by=category_data.get("who_inputs"),
        evaluation=category_data.get("evaluation"),
        active_status= 1 if category_data.get("status") == 'true' else 0,
        mark_each_question=category_data.get("mark_for_each_question"),
        public_access= 1 if category_data.get("public_access") == True else 0
    )
    session.add(new_category)
    session.commit()
    category_id = new_category.category_id
    department_ids = category_data.get("departments", [])
    team_ids = category_data.get("teams", [])
    for department_id in department_ids:
        category_department = CategoriesDepartments(
            category_id=category_id,
            department_id=department_id
        )
        session.add(category_department)
    for team_id in team_ids:
        category_team = CategoriesTeams(
            category_id=category_id,
            team_id=team_id
        )
        session.add(category_team)
    session.commit()
    json_data = {
        "statusMessage": "Category added successfully",
        "status": True
    }
    return json_data, 201

def update_category(category_id, request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    data = request.get_json()
    category = session.query(Categories).filter_by(category_id=category_id).first()
    if not category:
        return {"statusMessage": "Category not found", "status": False}, 404
    # update fields
    category.name = data.get('name', category.name)
    category.description = data.get('description', category.description)
    category.type = data.get('type', category.type)
    category.answer_by = data.get('who_inputs', category.answer_by)
    category.evaluation = data.get('evaluation', category.evaluation)
    # status mapping
    if 'status' in data:
        try:
            category.active_status = 1 if str(data.get('status')).lower() in ['true','1','yes'] else 0
        except Exception:
            pass
    if 'mark_for_each_question' in data:
        try:
            category.mark_each_question = data.get('mark_for_each_question')
        except Exception:
            pass
    if 'public_access' in data:
        category.public_access = 1 if data.get('public_access') else 0
    # update institute if provided
    if 'institute_id' in data:
        category.institute_id = data.get('institute_id')
    # update departments and teams references: simplistic approach - delete old links and add new
    try:
        session.query(CategoriesDepartments).filter_by(category_id=category_id).delete()
    except Exception:
        pass
    try:
        session.query(CategoriesTeams).filter_by(category_id=category_id).delete()
    except Exception:
        pass
    dept_ids = data.get('departments', []) or []
    team_ids = data.get('teams', []) or []
    for d in dept_ids:
        cd = CategoriesDepartments(category_id=category_id, department_id=d)
        session.add(cd)
    for t in team_ids:
        ct = CategoriesTeams(category_id=category_id, team_id=t)
        session.add(ct)
    session.commit()
    return {"statusMessage": "Category updated successfully", "status": True}, 200

def manage_category(action, uuid, updated_by):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    # support activate/deactivate/delete
    if action not in ["activate", "deactivate", "delete"]:
        return {"statusMessage": f"Invalid action '{action}'. Use 'activate', 'deactivate' or 'delete'.", "status": False}, 400
    category = session.query(Categories).filter_by(category_id=uuid).first()
    if not category:
        return {"statusMessage": "Category not found", "status": False}, 404
    if action == 'delete':
        try:
            # remove related department/team links first
            session.query(CategoriesDepartments).filter_by(category_id=uuid).delete()
        except Exception:
            pass
        try:
            session.query(CategoriesTeams).filter_by(category_id=uuid).delete()
        except Exception:
            pass
        session.delete(category)
        session.commit()
        return {"statusMessage": "Category deleted", "status": True}, 200
    # activate/deactivate
    category.active_status = 1 if action == 'activate' else 0
    category.updated_by = updated_by
    category.updated_date = datetime.utcnow()
    session.commit()
    return {"statusMessage": f"Category {'activated' if category.active_status else 'deactivated'} successfully", "status": True}, 200