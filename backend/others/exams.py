from db.models import Exam, ExamSchedule, Question, Option, Answer,Exam_Attempt, ExamMapping, Categories, ExamScheduleMapping, QuestionMapping, ExamQuestionMapping
from db.db import SQLiteDB
from others.exam_review import validate_answers
import sys
from datetime import datetime
from db.models import Institute, User
from sqlalchemy import or_
import random


def add_exam(request):
    # get exam details from the request
    data = request.json
    title = data.get("title")
    description = data.get("description", None)
    institute_id = data.get("institute_id")
    duration_mins = data.get("duration_minutes", 0)
    total_questions = data.get("total_questions", 0)
    pass_mark = data.get("pass_mark", 0)
    number_of_attempts = data.get("number_of_attempts", 0)

    start_time_str = data.get("start_time", None)
    end_time_str = data.get("end_time", None)
    created_by = data.get("created_by")

    # Convert ISO 8601 string to datetime object
    start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00")) if start_time_str else None
    end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00")) if end_time_str else None

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:
        add_exam = Exam(
            title=title,
            description= description,
            institute_id=institute_id,
            duration_mins=duration_mins,
            total_questions=total_questions,
            number_of_attempts=number_of_attempts,
            pass_mark= pass_mark,
            start_time=start_time,
            end_time=end_time,
            created_by=created_by
        )
        session.add(add_exam)
        session.flush()

        exam_id = add_exam.exam_id
        categories_list = data.get("categories",[])
        for category in categories_list:
            category_id = category.get("category_id")
            number_of_questions = category.get("questions", 0)
            randomize_questions = category.get("randomize_questions", 0)
            if randomize_questions == True:
                randomize_questions =1
            else:
                randomize_questions = 0
            new_mapping  =ExamMapping(
                exam_id= exam_id,
                category_id =category_id,
                number_of_questions=number_of_questions,
                randomize_questions=randomize_questions
            )
            session.add(new_mapping)
            if randomize_questions == 0:
                questions_list = category.get("question_ids", [])
                for question_id in questions_list:
                    add_exam_question_mapping = ExamQuestionMapping(
                        exam_id = exam_id,
                        category_id = category_id,
                        question_id = question_id
                    )
                    session.add(add_exam_question_mapping)

        session.commit()
        json_data ={
            "statusMessage": "Exam inserted successfully",
            "status": True
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while inserting exam at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error inserting exam",
            "status": False,
        }
        return json_data, 500


def update_exam(request):
    data = request.json
    exam_id = data.get('exam_id') or data.get('id')
    if not exam_id:
        return {"statusMessage": "Missing exam_id", "status": False}, 400

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        exam = session.query(Exam).filter(Exam.exam_id == exam_id).first()
        if not exam:
            return {"statusMessage": "Exam not found", "status": False}, 404

        # update scalar fields
        exam.title = data.get('title', exam.title)
        exam.description = data.get('description', exam.description)
        exam.institute_id = data.get('institute_id', exam.institute_id)
        exam.duration_mins = data.get('duration_minutes', exam.duration_mins)
        exam.total_questions = data.get('total_questions', exam.total_questions)
        exam.pass_mark = data.get('pass_mark', exam.pass_mark)
        exam.number_of_attempts = data.get('number_of_attempts', exam.number_of_attempts)

        # handle optional start/end times
        start_time_str = data.get('start_time', None)
        end_time_str = data.get('end_time', None)
        if start_time_str:
            try:
                exam.start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            except Exception:
                pass
        if end_time_str:
            try:
                exam.end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except Exception:
                pass

        # rebuild mappings: remove existing mappings for this exam and recreate from payload
        # remove ExamMapping and ExamQuestionMapping rows for this exam
        session.query(ExamMapping).filter(ExamMapping.exam_id == exam_id).delete(synchronize_session=False)
        session.query(ExamQuestionMapping).filter(ExamQuestionMapping.exam_id == exam_id).delete(synchronize_session=False)

        categories_list = data.get('categories', [])
        for category in categories_list:
            category_id = category.get('category_id')
            number_of_questions = category.get('questions', 0)
            randomize_questions = category.get('randomize_questions', 0)
            if randomize_questions == True:
                randomize_questions = 1
            else:
                randomize_questions = 0
            new_mapping = ExamMapping(
                exam_id=exam_id,
                category_id=category_id,
                number_of_questions=number_of_questions,
                randomize_questions=randomize_questions
            )
            session.add(new_mapping)
            if randomize_questions == 0:
                questions_list = category.get('question_ids', [])
                for question_id in questions_list:
                    add_exam_question_mapping = ExamQuestionMapping(
                        exam_id=exam_id,
                        category_id=category_id,
                        question_id=question_id
                    )
                    session.add(add_exam_question_mapping)

        session.commit()
        return {"statusMessage": "Exam updated successfully", "status": True}, 200
    except Exception as e:
        print(f"{e} occurred while updating exam at line {sys.exc_info()[-1].tb_lineno}")
        session.rollback()
        return {"statusMessage": "Error updating exam", "status": False}, 500
    
def get_exam_details(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500
    
    try:
        filter = []
        args = getattr(request, "args", {})
        if args.get("institute_id", None):
            filter.append(Exam.institute_id == args["institute_id"])
        if args.get("name", None):
            filter.append(Exam.title.ilike(f"%{args.get('name')}%"))
        if args.get("created_before", None):
            created_before = datetime.fromisoformat(args["created_before"].replace("Z", "+00:00"))
            filter.append(Exam.created_date <= created_before)
        # created after a specific date
        if args.get("created_after", None):
            created_after = datetime.fromisoformat(args["created_after"].replace("Z", "+00:00"))
            filter.append(Exam.created_date >= created_after)
        created_by = args.get("created_by", None)
        if created_by:
            # get user id from username
            user = session.query(User).filter(User.username == created_by).first()
            if user:
                filter.append(Exam.created_by == user.user_id)
        if args.get('exam_id', None):
            filter.append(Exam.exam_id == args['exam_id'])
            

        # join with Institute to fetch institute details as well
        # rows = session.query(ExamScheduleMapping, ExamSchedule, Exam).join(ExamSchedule, ExamScheduleMapping.schedule_id == ExamSchedule.schedule_id).join(Exam, ExamSchedule.exam_id == Exam.exam_id).filter(*filter).all()
        rows = session.query(Exam, Institute).join(Institute, Exam.institute_id == Institute.institute_id).filter(*filter).all()

        # keep exams as list of Exam objects for existing usage
        exams = [row[0] for row in rows]
        # map institute_id -> Institute object for later use
        institutes_by_id = {row[1].institute_id: row[1] for row in rows}
        if exams is None or len(exams) == 0:
            return {"statusMessage": "No exams found", "status": False}, 404

        exam_list = []
        for exam in exams:
            category_list = []
            mappings = session.query(ExamMapping).filter(ExamMapping.exam_id == exam.exam_id).all()
            for mapping in mappings:
                category_data = {
                "number_of_questions": mapping.number_of_questions if mapping else 0,
                "randomize_questions": True if mapping and mapping.randomize_questions == 1 else False,
                }
                category_data["category"] = {}
                categories = session.query(Categories).filter(Categories.category_id == mapping.category_id).all()
                # categories, mappings = session.query(Categories, ExamMapping).join(ExamMapping, Categories.category_id == ExamMapping.category_id).filter(ExamMapping.exam_id == exam.exam_id).all()
            
                for category in categories:
                    category_data["category"] = {
                        "category_id": category.category_id,
                        "category_name": category.name,
                        "description": category.description,
                    }
                    if mapping.randomize_questions == 0:
                        question_mappings = session.query(ExamQuestionMapping).filter(
                            ExamQuestionMapping.exam_id == exam.exam_id,
                            ExamQuestionMapping.category_id == category.category_id
                        ).all()
                        question_ids = [qm.question_id for qm in question_mappings]
                        questions = session.query(Question).filter(Question.question_id.in_(question_ids)).all()
                        category_data["questions"] = [{
                            "question_id": q.question_id,
                            "question_text": q.question_text,
                            "question_type": q.question_type,
                            "marks": q.marks
                        } for q in questions]
                    else:
                        category_data["questions"] = []
                    
                category_list.append(category_data)
            # category_list = [{"category_id": cat.category_id, "category_name": cat.name, "description": cat.description} for cat in categories]
                # get created user details
            created_user_name = None
            if exam.created_by:
                created_user = session.query(User).filter_by(user_id=exam.created_by).first()
                if created_user:
                    created_user_name = created_user.full_name
            # updated user details
            updated_user_name = None
            if exam.updated_by:
                updated_user = session.query(User).filter_by(user_id=exam.updated_by).first()
                if updated_user:
                    updated_user_name = updated_user.full_name

            exam_list.append({
                "exam_id": exam.exam_id,
                "title": exam.title,
                "institute": {
                    "institute_id": institutes_by_id.get(exam.institute_id, None).institute_id,
                    "institute_name": institutes_by_id.get(exam.institute_id, None).name,
                },
                "categories": category_list,
                "description": exam.description,
                "duration_mins": exam.duration_mins,
                "total_questions": exam.total_questions,
                "number_of_attempts": exam.number_of_attempts,
                "pass_mark": exam.pass_mark,
                "published": True if exam.published == 1 else False,
                "public_access": True if exam.public_access == 1 else False,
                # "start_time": exam.start_time,
                # "end_time": exam.end_time,
                "created_by": created_user_name,
                "created_date": exam.created_date,
                "updated_by": updated_user_name,
                "updated_date": exam.updated_date
            })
    # institute_id	start_time	end_time	created_by	created_date	updated_by	updated_date	published
        json_data = {
            "statusMessage": "Exams retrieved successfully",
            "status": True,
            "data": exam_list
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while retrieving exams at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error retrieving exams",
            "status": False,
        }
        return json_data, 500

def get_exam_list(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        filter = []
        args = getattr(request, "args", {})
        if args.get("institute_id", None):
            filter.append(Exam.institute_id == args["institute_id"])
        exams = session.query(Exam).filter(*filter).all()
        if exams is None or len(exams) == 0:
            return {"statusMessage": "No exams found", "status": False}, 404

        exam_list = []
        for exam in exams:
            exam_list.append({
                "id": exam.exam_id,
                "title": exam.title,
                "description": exam.description
            })

        json_data = {
            "statusMessage": "Exams retrieved successfully",
            "status": True,
            "data": exam_list
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while retrieving exams at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error retrieving exams",
            "status": False,
        }
        return json_data, 500
    
def get_user_exam_details(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500
    
    try:
        filter = []
        args = getattr(request, "args", {})
        conds = []
        if args.get("user_id", None):
            conds.append(ExamScheduleMapping.user_id == args["user_id"])
        if args.get("institute_id", None):
            conds.append(ExamSchedule.institute_id == args["institute_id"])
        if args.get("department_id", None):
            conds.append(ExamSchedule.department_id == args["department_id"])
        if args.get("team_id", None):
            conds.append(ExamSchedule.team_id == args["team_id"])
        # combine all provided conditions with OR (any one matching)
        if conds:
            filter.append(or_(*conds))

        # join with Institute to fetch institute details as well
        rows = session.query(ExamScheduleMapping, ExamSchedule, Exam).join(ExamSchedule, ExamScheduleMapping.schedule_id == ExamSchedule.schedule_id).join(Exam, ExamSchedule.exam_id == Exam.exam_id).filter(*filter).all()
        # keep exams as list of Exam objects for existing usage
        Schedule_list = [row[0] for row in rows]
        schedules = [row[1] for row in rows]
        exams = [row[2] for row in rows]
        if exams is None or len(exams) == 0:
            return {"statusMessage": "No exams found", "status": False}, 404

        scheduler_data = []
        for row in Schedule_list:
            # find corresponding schedule and exam objects for this mapping
            try:
                idx = Schedule_list.index(row)
                schedule_obj = schedules[idx]
                exam_obj = exams[idx]
            except ValueError:
                # fallback if mapping not found in list
                schedule_obj = None
                exam_obj = None
            # get attempt data for this user and schedule
            user_id = args.get("user_id", None)
            attempts = session.query(Exam_Attempt).filter(
                Exam_Attempt.user_id == user_id,
                Exam_Attempt.schedule_id == schedule_obj.schedule_id if schedule_obj else None
            ).all()
            # if no attempts found, set user_review to False
            if not attempts:
                user_attempt = 0
            else:
                user_attempt = len(attempts)
            
            no_of_attempts = schedule_obj.number_of_attempts if schedule_obj else exam_obj.number_of_attempts if exam_obj else 0

            user_review_data = schedule_obj.user_review if schedule_obj else None
            user_review = False
            # if current time between start and end time, exam is active
            current_time = datetime.utcnow()
            if schedule_obj.start_time <= current_time <= schedule_obj.end_time:
                type = 'active'
            elif schedule_obj.end_time and current_time > schedule_obj.end_time:
                type = 'completed'
                # if user_review_data == 1:
                user_review = True
            else:
                type = 'upcoming'
            if no_of_attempts <= user_attempt:
                type = 'completed' # if no of attempts exceeded, user cannot review
                if user_review_data == 1:
                    user_review = True

            scheduler_data.append({
                "mapping_id": getattr(row, "mapping_id", None),
                "schedule_id": getattr(schedule_obj, "schedule_id", None),
                "schedule_title": getattr(schedule_obj, "title", None),
                "exam_id": getattr(exam_obj, "exam_id", None),
                "exam_title": getattr(exam_obj, "title", None),
                "duration_mins": getattr(exam_obj, "duration_mins", None),
                "total_questions": getattr(exam_obj, "total_questions", None),
                "pass_mark": getattr(exam_obj, "pass_mark", None),
                "number_of_attempts": getattr(schedule_obj, "number_of_attempts", None),
                "user_review" :user_review,
                "start_time": getattr(schedule_obj, "start_time", getattr(exam_obj, "start_time", None)),
                "end_time": getattr(schedule_obj, "end_time", getattr(exam_obj, "end_time", None)),
                "created_by": getattr(schedule_obj, "created_by", getattr(exam_obj, "created_by", None)),
                "created_date": getattr(schedule_obj, "created_date", getattr(exam_obj, "created_date", None)),
                "updated_by": getattr(schedule_obj, "updated_by", None),
                "updated_date": getattr(schedule_obj, "updated_date", None),
                "type": type
            })


            # print(getattr(schedule_obj, "schedule_id", None))
            # print(row.schedule_id)


        json_data = {
            "statusMessage": "Exams retrieved successfully",
            "status": True,
            "data": scheduler_data
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while retrieving exams at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error retrieving exams",
            "status": False,
        }
        return json_data, 500

def get_exam_list(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        filter = []
        args = getattr(request, "args", {})
        if args.get("institute_id", None):
            filter.append(Exam.institute_id == args["institute_id"])
        if args.get("name", None):
            filter.append(Exam.title.ilike(f"%{args.get('name')}%"))
        if args.get("created_after", None):
            created_after = datetime.fromisoformat(args["created_after"].replace("Z", "+00:00"))
            filter.append(Exam.created_date >= created_after)
        if args.get("created_before", None):
            created_before = datetime.fromisoformat(args["created_before"].replace("Z", "+00:00"))
            filter.append(Exam.created_date <= created_before)
        if args.get("created_by", None):
            filter.append(Exam.created_by == args["created_by"])


        exams = session.query(Exam).filter(*filter).all()
        if exams is None or len(exams) == 0:
            return {"statusMessage": "No exams found", "status": False}, 404

        exam_list = []
        for exam in exams:
            exam_list.append({
                "id": exam.exam_id,
                "title": exam.title,
                "description": exam.description,
                "total_questions": exam.total_questions,
                "pass_mark": exam.pass_mark,
                "duration_mins": exam.duration_mins
            })

        json_data = {
            "statusMessage": "Exams retrieved successfully",
            "status": True,
            "data": exam_list
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while retrieving exams at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error retrieving exams",
            "status": False,
        }
        return json_data, 500

def launch_exam_details(schedule_id, user_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        # add Exam_Attempts 
        # Check if an attempt already exists for this user and exam
        existing_attempt = session.query(Exam_Attempt).filter_by(schedule_id=schedule_id, user_id=user_id).order_by(Exam_Attempt.attempt_number.desc()).first()
        if existing_attempt:
            attempt_number = existing_attempt.attempt_number + 1
        else:
            attempt_number = 1

        new_attempt = Exam_Attempt(
            schedule_id=schedule_id,
            user_id=user_id,
            attempt_number=attempt_number,
            started_date= datetime.utcnow(),
            status="in_progress"
        )
        session.add(new_attempt)
        session.commit()

        # get ExamSchedule details
        exam_schedule = session.query(ExamSchedule).filter_by(schedule_id=schedule_id).first()

        # get Exam details
        exam_data = session.query(Exam).filter_by(exam_id=exam_schedule.exam_id).first()

        # get ExamMapping details
        exam_mapping = session.query(ExamMapping).filter_by(exam_id=exam_schedule.exam_id).all()

        category_ids = [m.category_id for m in exam_mapping if getattr(m, "category_id", None)]


        randomized_question_ids = []
        non_randomized_question_ids = []
        
        for mapping in exam_mapping:
            if mapping.randomize_questions == 1:
                # Get random questions for this category
                all_questions = session.query(QuestionMapping.question_id).filter(
                    QuestionMapping.category_id == mapping.category_id
                ).all()
                question_ids_for_category = [q.question_id for q in all_questions]
                
                # Randomly select the specified number of questions
                if len(question_ids_for_category) >= mapping.number_of_questions:
                    selected_questions = random.sample(question_ids_for_category, mapping.number_of_questions)
                else:
                    selected_questions = question_ids_for_category  # Take all if not enough
                randomized_question_ids.extend(selected_questions)
            else:
            # Get pre-selected questions from ExamQuestionMapping
                predefined_questions = session.query(ExamQuestionMapping.question_id).filter(
                    ExamQuestionMapping.exam_id == exam_schedule.exam_id,
                    ExamQuestionMapping.category_id == mapping.category_id
                ).all()
                non_randomized_question_ids.extend([q.question_id for q in predefined_questions])
        
        # Combine both randomized and non-randomized questions
        question_ids = randomized_question_ids + non_randomized_question_ids
        # get list of question ids from question mapping
        # question_ids = []
        # for qm in question_mapping:
        #     if qm.question_id:
        #         question_ids.append(qm.question_id)


        # # fetch the exam/schedule mapping for this schedule_id
        # row = session.query(ExamSchedule, Exam, Categories, QuestionMapping) \
        #     .select_from(QuestionMapping) \
        #     .join(ExamSchedule, ExamSchedule.schedule_id == ExamSchedule.schedule_id) \
        #     .join(Exam, ExamSchedule.exam_id == Exam.exam_id) \
        #     .join(ExamMapping, Exam.exam_id == ExamMapping.exam_id) \
        #     .join(Categories, ExamMapping.category_id == Categories.category_id) \
        #     .join(QuestionMapping, Categories.category_id == QuestionMapping.category_id) \
        #     .filter(ExamSchedule.schedule_id == schedule_id) \
        #     .all()
        # if not row:
        #     return {"statusMessage": "Exam schedule mapping not found", "status": False}, 404
        # scheduler_data = row[0]  # ExamSchedule object
        # exam_data = row[1]  # Exam object
        # category_data = row[2]  # Categories object
        # question_mapping = row[3]  # QuestionMapping object

        # # get question id list from question mapping
        # question_ids = question_mapping.question_ids.split(',') if question_mapping and question_mapping.question_ids else []

        exam_detail = {        
            "exam_id": exam_data.exam_id,
            "schedule_id": schedule_id,
            "title": exam_data.title,
            "attempt_id": new_attempt.attempt_id,
            "duration_mins": exam_data.duration_mins,
            "total_questions": exam_data.total_questions}


        # get all the Questions and options for exam id
        questions = session.query(Question).filter(Question.question_id.in_(question_ids)).all()
        if not questions:
            return {"statusMessage": "No questions found", "status": False}, 404

        question_list = []
        for question in questions:
            options = session.query(Option).filter_by(question_id=question.question_id).all()
            option_list = [{"id": opt.options_id, "text": opt.option_text} for opt in options]
            question_list.append({
                "question_id": question.question_id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "options": option_list if question.question_type in ['choose', 'multi'] else []
            })

        json_data = {
            "statusMessage": "Exam details retrieved successfully",
            "status": True,
            "data": {
                "exam_detail": exam_detail,
                "questions": question_list
            }
        }
        return json_data, 200
    except Exception as e:
        print(f"{e} occurred while retrieving exam details at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error retrieving exam details",
            "status": False,
        }
        return json_data, 500

def submit_exam_answers(data):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        user_id = data.get("user_id")
        schedule_id = data.get("schedule_id")
        answers = data.get("answers", {})
        submitted_date = data.get("submitted_at")
        time_taken_mins = data.get("time_taken_mins")
        attempt_id = data.get("attempt_id")
        
        submitted_date = datetime.fromisoformat(submitted_date.replace("Z", "+00:00"))

        # update records in Exam_Attempt
        # Update the Exam_Attempt record for the given attempt_id
        exam_attempt = session.query(Exam_Attempt).filter_by(attempt_id=attempt_id).first()
        if exam_attempt:
            exam_attempt.submitted_date = submitted_date
            exam_attempt.status = "submitted"
            session.commit()

        for question_id, answer_value in answers.items():
            if isinstance(answer_value, list):
                # Multiple choice (multi-select)
                for option_id in answer_value:
                    new_answer = Answer(
                    user_id=user_id,
                    schedule_id=schedule_id,
                    question_id=question_id,
                    attempt_id=attempt_id,
                    selected_option_id=option_id,
                    written_answer=None,
                    # submitted_at=submitted_at,
                    # time_taken_mins=time_taken_mins
                    )
                    session.add(new_answer)
            elif isinstance(answer_value, str):
                if len(answer_value) == 36 and '-' in answer_value:
                    # Single choice (option id)
                    new_answer = Answer(
                    user_id=user_id,
                    schedule_id=schedule_id,
                    question_id=question_id,
                    attempt_id=attempt_id,
                    selected_option_id=answer_value,
                    written_answer=None,
                    # submitted_at=submitted_at,
                    # time_taken_mins=time_taken_mins
                    )
                    session.add(new_answer)
                else:
                    # Written answer
                    new_answer = Answer(
                    user_id=user_id,
                    schedule_id=schedule_id,
                    question_id=question_id,
                    attempt_id=attempt_id,
                    selected_option_id=None,
                    written_answer=answer_value,
                    # submitted_at=submitted_at,
                    # time_taken_mins=time_taken_mins
                    )
                    session.add(new_answer)

        session.commit()
        session.close()
        validate_answers(attempt_id)
        json_data = {
            "statusMessage": "Exam answers submitted successfully",
            "status": True,
        }
        return json_data, 200
    except Exception as e:
        session.rollback()
        session.close()
        print(f"{e} occurred while submitting exam answers at line {sys.exc_info()[-1].tb_lineno}")
        json_data = {
            "statusMessage": "Error submitting exam answers",
            "status": False,
        }
        return json_data, 500