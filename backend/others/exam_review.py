from sqlalchemy import func
from db.db import SQLiteDB
from db.models import Exam, ExamSchedule, Question, Option, Answer,Exam_Attempt, ExamScheduleMapping

def review_user_exam(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500
    
    args = getattr(request, "args", {})

    user_id: str = args.get("user_id", "")
    schedule_id: str = args.get("scheduler_id", "")

    try:
        # Fetch exam attempt records for the user and exam schedule
        attempts = session.query(Exam_Attempt).filter(
            Exam_Attempt.user_id == user_id,
            Exam_Attempt.schedule_id == schedule_id
        ).all()

        attempt_reviews = []
        for attempt in attempts:
            review_data = {}
            review_data["attempt_id"] = attempt.attempt_id
            review_data["attempt_number"] = attempt.attempt_number
            review_data["started_date"] = attempt.started_date
            review_data["submitted_date"] = attempt.submitted_date
            time_delta = attempt.submitted_date - attempt.started_date if attempt.submitted_date and attempt.started_date else None
            review_data["time_taken"] = str(time_delta) if time_delta else None
            review_data["status"] = attempt.status
            review_data["score"] = attempt.score
            review_data["percentage"] = attempt.percentage
            review_data["result"] = attempt.feedback if hasattr(attempt, 'feedback') else ""
            review_data["review"] = []
            
            # get question, selected option, and correct answer
            question_list = (session.query(Answer).filter(Answer.attempt_id == attempt.attempt_id)
                .group_by(Answer.question_id).all())
            for question_answer in question_list:
                
                question = session.query(Question).filter(Question.question_id == question_answer.question_id).first()
                question_type = question.question_type if question else ""
                if question_type in ["fill", 'choose']:
                    selected_option = session.query(Option).filter(Option.question_id == question_answer.question_id, Option.is_correct == 1, Option.active_status == 1).first()
                    correct_answer_data = selected_option.option_text if selected_option else ""
                    selected_option = question_answer.written_answer
                    if question_type == "choose":
                        selected_data = session.query(Option).filter(Option.options_id == question_answer.selected_option_id, Option.active_status == 1).first()
                        selected_option = selected_data.option_text if selected_data else ""
                else:
                    selected_options = session.query(Option).join(Answer, Answer.selected_option_id == Option.options_id).filter(
                        Answer.attempt_id == attempt.attempt_id,
                        Answer.question_id == question_answer.question_id,
                        Option.active_status == 1
                    ).all()
                    selected_option_texts = [opt.option_text for opt in selected_options]
                    selected_option = ", ".join(selected_option_texts)
                    correct_answer = session.query(Option).filter(Option.question_id == question_answer.question_id, Option.is_correct == 1, Option.active_status == 1).all()
                    correct_answer_data = ", ".join([ans.option_text for ans in correct_answer])
                options_list = session.query(Option).filter(Option.question_id == question_answer.question_id, Option.active_status == 1).all()

                review_data["review"].append({
                    "question_text": question.question_text  if question else "",
                    "question_type": question_type,
                    "options": [{"option_text": opt.option_text, "is_correct": opt.is_correct} for opt in options_list],
                    "selected_option": [selected_option] if isinstance(selected_option, str) else selected_option,
                    # "correct_option": correct_answer_data,
                    "is_correct": True if question_answer.is_correct == 1 else False,
                    "marks_awarded": question_answer.marks_awarded if question_answer.marks_awarded is not None else 0,
                    "feedback": question_answer.feedback if hasattr(question_answer, 'feedback') else ""
                })   
            attempt_reviews.append(review_data)

    except Exception as e:
        return {"statusMessage": f"Error fetching exam review: {str(e)}", "status": False}, 500
    finally:
        session.close()
        json_data = {"statusMessage": "Success", "status": True, "data": attempt_reviews}
        return json_data, 200
def validate_answers(attempt_id):
    db = SQLiteDB()
    session = db.connect()

    # connect llm model
    llama = '' #LlamaAPI()

    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500
    
    # get answer records
    answers = session.query(Answer).filter_by(attempt_id=attempt_id, is_validated=0).all()

    # Group answers by question_id
    answers_by_question = {}
    for ans in answers:
        answers_by_question.setdefault(ans.question_id, []).append(ans)

    for question_id, question_answers in answers_by_question.items():
        # get the corresponding question
        question = session.query(Question).filter_by(question_id=question_id).first()
        if not question:
            continue
        correct_options = session.query(Option).filter_by(question_id=question_id, active_status=1).all()
        if question.question_type == 'fill' :
            # For text or code questions, manual validation is required
            for ans in question_answers:
                written_answer = ans.written_answer.strip().lower() if ans.written_answer else ""
                correct_answers = correct_options[0].option_text.strip().lower()
                written_answer = ans.written_answer.strip().lower() if ans.written_answer else ""
                correct_answers = correct_options[0].option_text.strip().lower()
                if written_answer == correct_answers:
                    is_correct = 1
                    marks_awarded = question.marks
                    feedback_part = None
                else:
                    is_correct = 0
                    marks_awarded = 0
                    feedback_part = "Answer does not match the expected response."
                ans.is_correct = is_correct
                ans.marks_awarded = marks_awarded
                ans.is_validated = 1
                ans.feedback = feedback_part
                session.add(ans)
        else:

            # get the correct options for the question
            correct_option_ids = set(
                    opt.options_id for opt in session.query(Option).filter_by(question_id=question_id, is_correct=1).all()
                )

            selected_option_ids = set(ans.selected_option_id for ans in question_answers)

            missing_options = correct_option_ids - selected_option_ids
            incorrect_options = selected_option_ids - correct_option_ids

            is_fully_correct = len(missing_options) == 0 and len(incorrect_options) == 0
            awarded_marks = question.marks if is_fully_correct else 0
            if is_fully_correct:
                feedback = None
            else:
                feedback = f"Incorrect. Missing correct options: {missing_options}. " if missing_options else "" f"Incorrectly selected options: {incorrect_options}."

            # Update all answer rows for this question
            for ans in question_answers:
                ans.is_correct = 1 if is_fully_correct else 0
                ans.marks_awarded = awarded_marks
                ans.is_validated = 1
                ans.feedback = feedback
                session.add(ans)
            # Optional: print/log debug info
            if not is_fully_correct:
                print(f"[INVALID] Question: {question_id}")
                print(f"  Selected: {selected_option_ids}")
                print(f"  Missing correct options: {missing_options}")
                print(f"  Incorrectly selected options: {incorrect_options}")
    session.commit()
    session.close()

    # Update exam attempt score
    session = db.connect()
    try:
        attempt = session.query(Exam_Attempt).filter_by(attempt_id=attempt_id).first()
        if attempt:
            total_score = session.query(Answer).filter_by(attempt_id=attempt_id).with_entities(func.sum(Answer.marks_awarded)).scalar() or 0
            attempt.score = total_score
            total_possible_marks = session.query(Question).join(Answer, Answer.question_id == Question.question_id).filter(
                Answer.attempt_id == attempt_id
            ).with_entities(func.sum(Question.marks)).scalar() or 0
            passing_score = session.query(ExamSchedule).filter_by(schedule_id=attempt.schedule_id).first().pass_mark
            if total_possible_marks > 0 and (total_score / total_possible_marks * 100) >= passing_score:
                attempt.feedback = 'passed'
            else:
                attempt.feedback = 'failed'
            attempt.percentage = (total_score / total_possible_marks * 100) if total_possible_marks > 0 else 0
            attempt.status = 'evaluated'
            session.add(attempt)
            session.commit()
    except Exception as e:
        session.rollback()
        return {"statusMessage": f"Error updating exam attempt score: {str(e)}", "status": False}, 500
    finally:
        session.close()

    return {"statusMessage": "Answers validated successfully", "status": True}, 200

if __name__ == "__main__":
    # For testing purposes
    validate_answers("fa188ab2-23df-4c13-8f0f-77b3f15811e1")