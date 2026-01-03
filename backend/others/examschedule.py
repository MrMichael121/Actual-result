from db.models import Exam, ExamSchedule,ExamScheduleMapping, Question, Option, Answer,Exam_Attempt,Institute, User
from db.db import SQLiteDB
import sys
import datetime
from others.exam_review import validate_answers


def add_exam_schedule(request):
    # get exam details from the request
    data = request.json

    title = data.get("title")
    exam_id = data.get("exam_id")
    institute_id = data.get("institute_id")
    duration_mins = data.get("duration_mins")
    total_questions = data.get("total_questions")
    number_of_attempts = data.get("number_of_attempts")
    published = data.get("published", False)
    user_review = data.get("userreview", False)

    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    created_by = data.get("created_by")

    # Convert ISO 8601 string to datetime object
    start_time = datetime.datetime.fromisoformat(start_time_str.replace("Z", "+00:00")) if start_time_str else None
    end_time = datetime.datetime.fromisoformat(end_time_str.replace("Z", "+00:00")) if end_time_str else None

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    try:
        add_schedule = ExamSchedule(
            title=title,
            exam_id=exam_id,
            institute_id=institute_id,
            start_time=start_time,
            end_time=end_time,
            published=1 if published else 0,
            user_review=1 if user_review else 0,
            created_by=created_by
        )
        session.add(add_schedule)
        session.flush()
        schedule_id = add_schedule.schedule_id

        assigned_user_ids = data.get("assigned_user_ids", [])
        for user_id in assigned_user_ids:
            mapping = ExamScheduleMapping(
                schedule_id=schedule_id,
                user_id=user_id
            )
            session.add(mapping)
        session.commit()
        json_data ={
            "statusMessage": "Schedule added successfully",
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


def update_exam_schedule(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    data = request.json
    schedule_id = data.get('schedule_id') or data.get('id') or data.get('scheduleId')
    if not schedule_id:
        return {"statusMessage": "schedule_id is required", "status": False}, 400

    try:
        sched = session.query(ExamSchedule).filter_by(schedule_id=schedule_id).first()
        if not sched:
            return {"statusMessage": "Schedule not found", "status": False}, 404

        # Update basic fields if provided
        if 'title' in data:
            sched.title = data.get('title')
        if 'exam_id' in data:
            sched.exam_id = data.get('exam_id')
        if 'institute_id' in data:
            sched.institute_id = data.get('institute_id')
        if 'duration_mins' in data:
            try:
                sched.duration_mins = int(data.get('duration_mins') or 0)
            except Exception:
                pass
        if 'number_of_attempts' in data:
            try:
                sched.number_of_attempts = int(data.get('number_of_attempts') or 0)
            except Exception:
                pass
        if 'total_questions' in data:
            try:
                sched.total_questions = int(data.get('total_questions') or 0)
            except Exception:
                pass

        # published / user_review
        if 'published' in data:
            sched.published = 1 if data.get('published') else 0
        if 'userreview' in data:
            sched.user_review = 1 if data.get('userreview') else 0
        if 'user_review' in data:
            sched.user_review = 1 if data.get('user_review') else 0

        # times
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        if start_time_str:
            try:
                sched.start_time = datetime.datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            except Exception:
                pass
        if end_time_str:
            try:
                sched.end_time = datetime.datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except Exception:
                pass

        # updated_by
        if data.get('updated_by'):
            sched.updated_by = data.get('updated_by')
        elif data.get('current_user'):
            sched.updated_by = data.get('current_user')

        # Rebuild assigned user mappings if provided
        if 'assigned_user_ids' in data:
            try:
                # Delete existing mappings for this schedule
                session.query(ExamScheduleMapping).filter_by(schedule_id=schedule_id).delete()
                assigned_user_ids = data.get('assigned_user_ids') or []
                for user_id in assigned_user_ids:
                    mapping = ExamScheduleMapping(
                        schedule_id=schedule_id,
                        user_id=user_id
                    )
                    session.add(mapping)
            except Exception as e:
                print(f"Error updating mappings: {e}")

        sched.updated_date = datetime.datetime.utcnow()
        session.add(sched)
        session.commit()

        return {"statusMessage": "Schedule updated successfully", "status": True}, 200
    except Exception as e:
        session.rollback()
        print(f"{e} occurred while updating schedule at line {sys.exc_info()[-1].tb_lineno}")
        return {"statusMessage": "Error updating schedule", "status": False}, 500

def get_exam_schedule_details(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500
    
    try:
        filter = []
        args = getattr(request, "args", {})
        if args.get("institute_id"):
            filter.append(ExamSchedule.institute_id == args.get("institute_id"))
        if args.get("name"):
            filter.append(ExamSchedule.title.ilike(f"%{args.get('name')}%"))
        if args.get("created_by"):
            filter.append(ExamSchedule.created_by == args.get("created_by"))
        if args.get("created_before"):
            created_before = datetime.datetime.fromisoformat(args.get("created_before").replace("Z", "+00:00"))
            filter.append(ExamSchedule.created_date < created_before)
        if args.get("created_after"):
            created_after = datetime.datetime.fromisoformat(args.get("created_after").replace("Z", "+00:00"))
            filter.append(ExamSchedule.created_date > created_after)
        if args.get("active"):
            active = 0 if args.get("active").lower() == 'true' else 1
            filter.append(ExamSchedule.published == active)

        schedules = session.query(ExamSchedule).filter(*filter).all()
        if schedules is None or len(schedules) == 0:
            return {"statusMessage": "No schedules found", "status": False}, 404

        exam_list = []
        for schedule in schedules:
            #  get Exam details
            exam = session.query(Exam).filter_by(exam_id=schedule.exam_id).first()
            if exam:
                exam_title = exam.title
            # get institute details
            institute = session.query(Institute).filter_by(institute_id=schedule.institute_id).first()
            if institute:
                institute_name = institute.name
            # get user mappings list
            user_mappings = session.query(ExamScheduleMapping).filter_by(schedule_id=schedule.schedule_id).all()
            # get created_by and updated_by user details
            created_by_user = session.query(User).filter_by(user_id=schedule.created_by).first() if schedule.created_by else None
            updated_by_user = session.query(User).filter_by(user_id=schedule.updated_by).first() if schedule.updated_by else None



            user_list = []
            for mapping in user_mappings:
                user = session.query(User).filter_by(user_id=mapping.user_id).first()
                if user:
                    user_list.append({
                        "user_id": user.user_id,
                        "name": user.full_name,
                        "email": user.email
                    })
            exam_list.append({
                "schedule_id": schedule.schedule_id,
                "exam": { "exam_id": schedule.exam_id, "title": exam_title },
                "title": schedule.title,
                "institute": { "institute_id": schedule.institute_id, "name": institute_name },
                "assigned_users": user_list,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "created_by": created_by_user.full_name if created_by_user else None,
                "created_date": schedule.created_date,
                "updated_by": updated_by_user.full_name if updated_by_user else None,
                "updated_date": schedule.updated_date,
                "published": True if schedule.published == 1 else False,
                "user_review": True if schedule.user_review == 1 else False,
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

def get_exam_list(institute_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        exams = session.query(Exam).filter_by(institute_id=institute_id).all()
        if exams is None or len(exams) == 0:
            return {"statusMessage": "No exams found", "status": False}, 404

        exam_list = []
        for exam in exams:
            exam_list.append({
                "id": exam.exam_id,
                "title": exam.title,
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
    
def manage_schedule(action, uuid, updated_by='system'):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        sched = session.query(ExamSchedule).filter_by(schedule_id=uuid).first()
        if not sched:
            return {"statusMessage": "Schedule not found", "status": False}, 404

        action = action.lower()
        if action == 'activate':
            sched.published = 1
            sched.updated_by = updated_by
        elif action == 'deactivate':
            sched.published = 0
            sched.updated_by = updated_by
        elif action == 'delete':
            # delete mappings and schedule
            session.query(ExamScheduleMapping).filter_by(schedule_id=uuid).delete()
            session.delete(sched)
            session.commit()
            return {"statusMessage": "Schedule deleted", "status": True}, 200
        else:
            return {"statusMessage": f"Invalid action '{action}'", "status": False}, 400

        sched.updated_date = datetime.datetime.utcnow()
        session.add(sched)
        session.commit()
        return {"statusMessage": "Schedule updated", "status": True}, 200
    except Exception as e:
        session.rollback()
        return {"statusMessage": str(e), "status": False}, 500


def launch_exam_details(exam_id, user_id):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    try:
        # add Exam_Attempts 
        # Check if an attempt already exists for this user and exam
        existing_attempt = session.query(Exam_Attempt).filter_by(exam_id=exam_id, user_id=user_id).order_by(Exam_Attempt.attempt_number.desc()).first()
        if existing_attempt:
            attempt_number = existing_attempt.attempt_number + 1
        else:
            attempt_number = 1

        new_attempt = Exam_Attempt(
            exam_id=exam_id,
            user_id=user_id,
            attempt_number=attempt_number,
            started_date=datetime.datetime.utcnow(),
            status="in_progress"
        )
        session.add(new_attempt)
        session.commit()

        exam_data = session.query(Exam).filter_by(exam_id=exam_id).first()
        if not exam_data:
            return {"statusMessage": "Exam not found", "status": False}, 404
        exam_detail = {        
            "exam_id": exam_data.exam_id,
            "title": exam_data.title,
            "attempt_id": new_attempt.attempt_id,
            "duration_mins": exam_data.duration_mins,
            "total_questions": exam_data.total_questions}


        # get all the Questions and options for exam id
        questions = session.query(Question).filter_by(exam_id=exam_id).all()
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
        exam_id = data.get("exam_id")
        answers = data.get("answers", {})
        submitted_date = data.get("submitted_at")
        time_taken_mins = data.get("time_taken_mins")
        attempt_id = data.get("attempt_id")
        
        submitted_date = datetime.datetime.fromisoformat(submitted_date.replace("Z", "+00:00"))

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
                    exam_id=exam_id,
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
                    exam_id=exam_id,
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
                    exam_id=exam_id,
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