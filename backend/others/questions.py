from db.models import Question, Option, QuestionMapping, Categories, CategoriesDepartments, CategoriesTeams
from db.db import SQLiteDB
import sys
import pandas as pd

def add_question(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:

        data = request.json
        institute_id = data.get("institute_id")
        category_id = data.get("category_id",'2c35cee1-305d-4818-ad1e-fbc4af9566fe')

        for data in request.json.get('questions', []):
            question_type = data.get("type")
            question_text = data.get("text")
            marks = data.get("marks")
            created_by = data.get("created_by",'System')

            question_options = data.get("options")
            question_correct = data.get("correct")
            question_answer_text = data.get("answerText")
            question_correct_indices = data.get("correct_indices")

            question_data = Question(
                question_type=question_type,
                question_text=question_text,
                marks=marks,
                created_by=created_by
            )
            session.add(question_data)
            session.flush()  # To get question_data.id before commit

                # options=question_options,
                # correct=question_correct,
                # answerText=question_answer_text,
                # correct_indices=question_correct_indices,
            if question_type in ['choose', 'multi']:
                for idx, option_text in enumerate(question_options):
                    is_correct = 1 if idx in (question_correct_indices or []) else 0
                    option = Option(
                    question_id=question_data.question_id,
                    option_text=option_text,
                    is_correct=is_correct
                    )
                    session.add(option)
            else:
                question_answer = Option(
                    question_id=question_data.question_id,
                    option_text=question_answer_text,
                    is_correct=1
                )
                session.add(question_answer)
            mapping_data= QuestionMapping(
                question_id=question_data.question_id,
                category_id=category_id
            )
            session.add(mapping_data)
            session.commit()
        json_data ={
            "statusMessage": "Question inserted successfully",
            "status": True
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while inserting euestion at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error inserting question",
            "status": False,
        }
        return json_data, 500

def bulk_upload_questions(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None
    institute_id = request.form.get("institute_id", None)
    category_id = request.form.get("category_id", None)
    created_by = request.form.get("created_by", 'System')
    # get file from request
    file = request.files.get("file", None)
    if not file:
        return {"statusMessage": "No file provided", "status": False}, 400
    # read file using pandas
    df = pd.read_csv(file)
    
    for index, row in df.iterrows():
        question_type = "fill"
        question_text = row.get("Question")
        marks = row.get("marks", 1)
        question_correct = row.get("Correct_answer")

        if ',' in question_correct or (len(question_correct) ==1 and question_correct in '1234567890'):
            question_type = 'choose'
            question_correct_indices = [int(i) for i in question_correct.split(',')]
            if len(question_correct_indices) >1:
                question_type = 'multi'
        
        question_options_list = []
        for idx in range(1, 11):
            val = row.get(f"option_{idx}", None)
            if pd.isna(val):
                val = None
            question_options_list.append(val)

        question_options_list = [opt for opt in question_options_list if opt is not None]

        question_data = Question(
            question_type=question_type,
            question_text=question_text,
            marks=marks,
            created_by=created_by
        )
        session.add(question_data)
        session.flush()  # To get question_data.id before commit

        if question_type in ['choose', 'multi']:
            for idx, option_text in enumerate(question_options_list, start=1):
                is_correct = 1 if idx in (question_correct_indices or []) else 0
                option = Option(
                question_id=question_data.question_id,
                option_text=option_text,
                is_correct=is_correct
                )
                session.add(option)
        else:
            question_answer = Option(
                question_id=question_data.question_id,
                option_text=question_correct,
                is_correct=1
            )
            session.add(question_answer)
        mapping_data= QuestionMapping(
            question_id=question_data.question_id,
            category_id=category_id
        )
        session.add(mapping_data)
        session.commit()
    json_data ={
        "statusMessage": "Question inserted successfully",
        "status": True
    }
    return json_data, 200

def get_questions_details(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:
        filter = []
        args = getattr(request, "args", {})
        public_access = (1 if args.get("public_access", 'false') == 'true' else 0)

        if args.get("institute_id"):
            Category_data = session.query(Categories).filter_by(institute_id=args.get("institute_id")).all()
            Category_list = [c.category_id for c in Category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(Category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("category_name"):
            category_data = session.query(Categories).filter(Categories.name.ilike(f"%{args.get('category_name')}%"), Categories.public_access==public_access).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("category_id"):
            category_list = args.get("category_id").split(",")
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("departments"):
            # Assuming departments are linked to questions via categories
            department_ids = args.get("departments").split(",")
            category_data = session.query(CategoriesDepartments).filter(CategoriesDepartments.department_id.in_(department_ids)).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("teams"):
            # Assuming teams are linked to questions via categories
            team_ids = args.get("teams").split(",")
            category_data = session.query(CategoriesTeams).filter(CategoriesTeams.team_id.in_(team_ids)).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("created_by"):
            category_data = session.query(Categories).filter(Categories.created_by == args.get("created_by")).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("created_after"):
            category_data = session.query(Categories).filter(Categories.created_date >= args.get("created_after")).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("created_before"):
            category_data = session.query(Categories).filter(Categories.created_date <= args.get("created_before")).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))
        if args.get("public_access") is not None:
            category_data = session.query(Categories).filter(Categories.public_access == public_access).all()
            category_list = [c.category_id for c in category_data]
            mappingdata  = session.query(QuestionMapping).filter(QuestionMapping.category_id.in_(category_list)).all()
            question_list = [q.question_id for q in mappingdata]
            filter.append(Question.question_id.in_(question_list))

        questions = session.query(Question).filter(*filter).all()
        question_list = []
        for q in questions:
            options = session.query(Option).filter_by(question_id=q.question_id, active_status=1).all()
            option_list = [{"id": opt.options_id, "text": opt.option_text, "is_correct": opt.is_correct} for opt in options]
            
            # Get category information for this question
            mapping = session.query(QuestionMapping).filter_by(question_id=q.question_id).first()
            category = session.query(Categories).filter_by(category_id=mapping.category_id).first() if mapping else None
            
            question_list.append({
            "id": q.question_id,
            "text": q.question_text,
            "type": q.question_type,
            "marks": q.marks,
            "options": option_list,
            "category_id": mapping.category_id if mapping else None,
            "category": category.name if category else None,
            "category_description": category.description if category else None
            })
        json_data = {"status": True, "data": question_list, "total": len(question_list)}
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while fetching question details at line {sys.exc_info()[-1].tb_lineno}")
        return {"status": False, "message": "Error fetching question details"}, 500

def update_question(question_id, request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        data = request.json
        q = session.query(Question).filter_by(question_id=question_id).first()
        if not q:
            return {"statusMessage": "Question not found", "status": False}, 404

        # Update basic fields
        if 'type' in data: q.question_type = data.get('type')
        if 'text' in data: q.question_text = data.get('text')
        if 'marks' in data:
            try:
                q.marks = int(data.get('marks') or 0)
            except Exception:
                pass

        # Update options: update overlapping options by index, append new ones, delete surplus
        if 'options' in data:
            new_options = data.get('options') or []
            correct_indices = set(data.get('correct_indices') or [])
            existing_opts = session.query(Option).filter_by(question_id=question_id).all()

            # Update overlapping options
            min_len = min(len(existing_opts), len(new_options))
            for idx in range(min_len):
                opt = existing_opts[idx]
                try:
                    opt.option_text = new_options[idx]
                except Exception:
                    opt.option_text = str(new_options[idx])
                opt.is_correct = 1 if idx in correct_indices else 0

            # Append new options if provided
            for idx in range(min_len, len(new_options)):
                otext = new_options[idx]
                try:
                    otext = str(otext)
                except Exception:
                    pass
                is_correct = 1 if idx in correct_indices else 0
                new_opt = Option(question_id=question_id, option_text=otext, is_correct=is_correct)
                session.add(new_opt)

            # inactivate surplus existing options not present in new list
            for idx in range(len(new_options), len(existing_opts)):
                try:
                    existing_opts[idx].active_status = 0
                except Exception:
                    pass

        # Update mapping (category)
        if 'category_id' in data and data.get('category_id'):
            # update existing mapping or insert new
            mapping = session.query(QuestionMapping).filter_by(question_id=question_id).first()
            if mapping:
                mapping.category_id = data.get('category_id')
            else:
                newmap = QuestionMapping(question_id=question_id, category_id=data.get('category_id'))
                session.add(newmap)

        session.commit()
        return {"statusMessage": "Question updated", "status": True}, 200
    except Exception as e:
        session.rollback()
        return {"statusMessage": str(e), "status": False}, 500