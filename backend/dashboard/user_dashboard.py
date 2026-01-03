from db.db import SQLiteDB
from db.models import User, Exam_Attempt, Answer, ExamSchedule
from sqlalchemy import func
import datetime

def user_dashboard_details(user_id=None):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    # If user_id not provided, return empty or aggregated values
    try:
        q = session.query(Exam_Attempt).filter(Exam_Attempt.user_id == user_id) if user_id else session.query(Exam_Attempt)
        last_attempt = q.order_by(Exam_Attempt.submitted_date.desc()).first()
    except Exception:
        last_attempt = None

    last_score = None
    last_percent = None
    total_questions = 0
    accuracy = 0

    if last_attempt:
        last_score = getattr(last_attempt, 'score', None)
        last_percent = getattr(last_attempt, 'percentage', None)
        # count answers for that attempt
        try:
            answers = session.query(Answer).filter(Answer.user_id == user_id, Answer.attempt_id == last_attempt.attempt_id).all()
            total_questions = len(answers)
            correct = sum(1 for a in answers if getattr(a, 'is_correct', 0))
            accuracy = round((correct / total_questions) * 100, 2) if total_questions else 0
        except Exception:
            total_questions = 0
            accuracy = 0

    # simple charts: last 6 attempts score trend
    charts = []
    try:
        attempts = session.query(Exam_Attempt).filter(Exam_Attempt.user_id == user_id).order_by(Exam_Attempt.submitted_date.desc()).limit(6).all() if user_id else []
        attempts = list(reversed(attempts))
        labels = [str(getattr(a, 'submitted_date', ''))[:10] for a in attempts]
        values = [getattr(a, 'percentage', 0) or 0 for a in attempts]
        charts.append({'id': 'attempts_trend', 'type': 'line', 'title': 'Recent Attempts', 'data': {'labels': labels, 'values': values}})
    except Exception:
        pass

    # breakdown by category or subjects could be added here if schema available

    return {
        'last_score': last_score,
        'last_percent': last_percent,
        'total_questions': total_questions,
        'accuracy': accuracy,
        'charts': charts
    }

def dashboard_users_list():
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return []
    try:
        users = session.query(User).all()
        out = []
        for u in users:
            out.append({'id': getattr(u, 'user_id', None), 'name': getattr(u, 'full_name', None) or getattr(u, 'user_name', None) or getattr(u, 'email', None)})
        return out
    except Exception:
        return []
