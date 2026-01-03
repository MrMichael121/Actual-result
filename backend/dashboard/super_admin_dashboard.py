from db.db import SQLiteDB
from db.models import User, Institute, InstituteDepartment, InstituteTeam,InstituteCampus
import datetime
from db.models import ExamSchedule
from db.models import Exam, Question
def superadmin_dashboard_details():
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    # Summary counts
    total_institutes = session.query(Institute).count()
    total_users = session.query(User).count()
    # Assume Exam and Question models exist
    try:
        
        total_exams = session.query(Exam).count()
        total_questions = session.query(Question).count()
        today = datetime.date.today()
        active_exams = session.query(ExamSchedule).filter(
            ExamSchedule.start_time <= today,
            ExamSchedule.end_time >= today
        ).count()
        upcoming_exams = session.query(ExamSchedule).filter(
            ExamSchedule.start_time > today
        ).count()
        completed_exams = session.query(ExamSchedule).filter(
            ExamSchedule.end_time < today
        ).count()
    except ImportError:
        total_exams = total_questions = active_exams = upcoming_exams = completed_exams = 0

    summary = {
            "total_institutes": total_institutes,
            "total_users": total_users,
            "total_exams": total_exams,
            "total_questions": total_questions,
            "active_exams": active_exams,
            "upcoming_exams": upcoming_exams,
            "completed_exams": completed_exams
        }
    # Institute-wise User Count
    from sqlalchemy import func
    institute_user_counts = session.query(Institute.name, func.count(User.user_id)).join(User).group_by(Institute.institute_id).all()
    users_by_institute = [{"institute": name, "users": count} for name, count in institute_user_counts]
    chart_users_by_institute = {
        "id": "institutes_users",
        "title": "Institute-wise User Count",
        "type": "bar",
        "data": {
            "labels": [item["institute"] for item in users_by_institute],
            "values": [item["users"] for item in users_by_institute]
        }
    }

    # Monthly Exams Conducted
    monthly_exams = session.query(func.strftime("%Y-%m", ExamSchedule.created_date), func.count(ExamSchedule.schedule_id)).group_by(func.strftime("%Y-%m", ExamSchedule.created_date)).all()
    exams_conducted = [{"month": month, "exams": count} for month, count in monthly_exams]
    chart_exams_conducted = {
        "id": "monthly_exams",
        "title": "Monthly Exams Conducted",
        "type": "line",
        "data": {
            "labels": [item["month"] for item in exams_conducted],
            "values": [item["exams"] for item in exams_conducted]
        }
    }

    # Recent activity (last 5 users and exams)
    recent_users = session.query(User).order_by(User.created_date.desc()).limit(3).all()
    recent_exams = []
    try:
        recent_exams = session.query(Exam).order_by(Exam.created_date.desc()).limit(3).all()
    except Exception:
        pass
    recent_activity = []
    for u in recent_users:
        recent_activity.append({
            "type": "user_registered",
            "user": u.name if hasattr(u, 'name') else u.email,
            "institute": getattr(u, 'institute_name', None),
            "timestamp": str(getattr(u, 'created_at', ''))
        })
    for e in recent_exams:
        recent_activity.append({
            "type": "exam_created",
            "exam": e.title if hasattr(e, 'title') else str(e.id),
            "institute": getattr(e, 'institute_name', None),
            "timestamp": str(getattr(e, 'created_at', ''))
        })

    # Top institutes by user count
    top_institutes = []
    try:
        from sqlalchemy import func
        top = session.query(Institute, func.count(User.id).label('user_count'))\
            .join(User, User.institute_id == Institute.id)\
            .group_by(Institute.id)\
            .order_by(func.count(User.id).desc())\
            .limit(5).all()
        for inst, user_count in top:
            top_institutes.append({
                "name": inst.name,
                "users": user_count,
                "exams": getattr(inst, 'exam_count', 0),
                "active": getattr(inst, 'active', True)
            })
    except Exception:
        pass

    # Exam stats
    exam_stats = {}
    try:
        from sqlalchemy import func
        if 'Exam' in locals():
            avg_score = session.query(func.avg(Exam.average_score)).scalar() or 0
            pass_rate = session.query(func.avg(Exam.pass_rate)).scalar() or 0
            most_attempted = session.query(Exam).order_by(Exam.attempts.desc()).first()
            most_failed = session.query(Exam).order_by(Exam.failures.desc()).first()
            exam_stats = {
                "average_score": round(avg_score, 2),
                "pass_rate": round(pass_rate, 2),
                "most_attempted_exam": getattr(most_attempted, 'title', None),
                "most_failed_exam": getattr(most_failed, 'title', None)
            }
    except Exception:
        pass


    user_growth = []
    try:
        today = datetime.date.today()
        for i in range(30, -1, -1):
            day = today - datetime.timedelta(days=i)
            count = session.query(User).filter(func.date(User.created_at) <= day).count()
            user_growth.append({"date": str(day), "users": count})
    except Exception:
        pass

    # System health (dummy values, replace with real if available)
    system_health = {
        "uptime": "99.98%",
        "last_downtime": "2025-10-15T02:00:00Z",
        "active_sessions": 320
    }
    charts = [
        chart_users_by_institute,
        chart_exams_conducted
    ]
    json_data = {
        "summary": summary,
        "charts": charts,
        "details": {
        "recent_activity": recent_activity,
        "top_institutes": top_institutes,
        "exam_stats": exam_stats,
        },
        "user_growth": user_growth,
        "system_health": system_health
    }
    return json_data
    