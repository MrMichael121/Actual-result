from db.db import SQLiteDB
from db.models import User, Institute, ExamSchedule, Exam_Attempt, Exam
import datetime
from sqlalchemy import func

def admin_dashboard_details(institute_id=None):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    today = datetime.date.today()

    # Summary scoped to institute if provided
    try:
        total_students = session.query(User).filter(User.institute_id == institute_id).count() if institute_id else session.query(User).count()
    except Exception:
        total_students = 0

    try:
        # scheduled tests for this institute
        if institute_id:
            tests_scheduled = session.query(ExamSchedule).filter(ExamSchedule.institute_id == institute_id).count()
            upcoming_tests_count = session.query(ExamSchedule).filter(ExamSchedule.institute_id == institute_id, ExamSchedule.start_time > today).count()
            active_tests = session.query(ExamSchedule).filter(ExamSchedule.institute_id == institute_id, ExamSchedule.start_time <= today, ExamSchedule.end_time >= today).count()
            completed_tests = session.query(ExamSchedule).filter(ExamSchedule.institute_id == institute_id, ExamSchedule.end_time < today).count()
        else:
            tests_scheduled = session.query(ExamSchedule).count()
            upcoming_tests_count = session.query(ExamSchedule).filter(ExamSchedule.start_time > today).count()
            active_tests = session.query(ExamSchedule).filter(ExamSchedule.start_time <= today, ExamSchedule.end_time >= today).count()
            completed_tests = session.query(ExamSchedule).filter(ExamSchedule.end_time < today).count()
    except Exception:
        tests_scheduled = upcoming_tests_count = active_tests = completed_tests = 0

    # Attempts today (count of exam attempts submitted today for the institute)
    try:
        start_of_day = datetime.datetime.combine(today, datetime.time.min)
        end_of_day = datetime.datetime.combine(today, datetime.time.max)
        q = session.query(Exam_Attempt)
        if institute_id:
            q = q.join(ExamSchedule, Exam_Attempt.schedule_id == ExamSchedule.schedule_id).filter(ExamSchedule.institute_id == institute_id)
        attempts_today = q.filter(Exam_Attempt.submitted_date >= start_of_day, Exam_Attempt.submitted_date <= end_of_day).count()
    except Exception:
        attempts_today = 0

    # Average score for institute
    try:
        q2 = session.query(func.avg(Exam_Attempt.percentage))
        if institute_id:
            q2 = q2.join(ExamSchedule, Exam_Attempt.schedule_id == ExamSchedule.schedule_id).filter(ExamSchedule.institute_id == institute_id)
        avg_score = round((q2.scalar() or 0), 2)
    except Exception:
        avg_score = 0

    # Upcoming tests list (limit 10)
    upcoming_tests = []
    try:
        q3 = session.query(ExamSchedule).filter(ExamSchedule.start_time > datetime.datetime.now())
        if institute_id:
            q3 = q3.filter(ExamSchedule.institute_id == institute_id)
        rows = q3.order_by(ExamSchedule.start_time).limit(10).all()
        for r in rows:
            upcoming_tests.append({
                'title': getattr(r, 'title', None) or '',
                'class': '',
                'start': str(getattr(r, 'start_time', ''))
            })
    except Exception:
        upcoming_tests = []

    # simple charts: monthly exams and attempts
    charts = []
    try:
        monthly = session.query(func.strftime("%Y-%m", ExamSchedule.created_date), func.count(ExamSchedule.schedule_id)).group_by(func.strftime("%Y-%m", ExamSchedule.created_date)).all()
        months = [m for m, _ in monthly]
        vals = [c for _, c in monthly]
        charts.append({ 'id': 'monthly_exams', 'type': 'line', 'title': 'Monthly Tests', 'data': { 'labels': months, 'values': vals } })
    except Exception:
        pass

    summary = {
        'total_students': total_students,
        'scheduled_tests': tests_scheduled,
        'upcoming_exams': upcoming_tests_count,
        'active_exams': active_tests,
        'completed_exams': completed_tests,
        'attempts_today': attempts_today,
        'avg_score': avg_score
    }

    return {
        'summary': summary,
        'upcoming_tests': upcoming_tests,
        'charts': charts
    }
