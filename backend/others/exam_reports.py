from db.db import SQLiteDB
from db.models import User, ExamSchedule, Exam_Attempt, Answer, Exam, ExamMapping, ExamQuestionMapping, Question, Option
from sqlalchemy import func


def get_user_wise_report(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    args = getattr(request, 'args', {})
    schedule_id = args.get('schedule_id')
    if not schedule_id:
        return {"statusMessage": "Missing schedule_id", "status": False}, 400

    q = (args.get('q') or '').strip().lower()
    try:
        page = int(args.get('page', 1))
    except Exception:
        page = 1
    try:
        page_size = int(args.get('page_size', 25))
    except Exception:
        page_size = 25

    try:
        # find distinct users who have attempts for this schedule
        user_ids = session.query(Exam_Attempt.user_id).filter(Exam_Attempt.schedule_id == schedule_id).distinct().all()
        user_ids = [u[0] for u in user_ids]

        rows = []
        # get pass_mark from schedule
        schedule = session.query(ExamSchedule).filter(ExamSchedule.schedule_id == schedule_id).first()
        pass_mark = schedule.pass_mark if schedule and schedule.pass_mark is not None else None

        for uid in user_ids:
            user = session.query(User).filter(User.user_id == uid).first()
            if not user:
                continue

            # compute aggregates from Answers for this user and schedule
            answers = session.query(Answer).filter(Answer.schedule_id == schedule_id, Answer.user_id == uid).all()
            questions_attempted = len(set([a.question_id for a in answers]))
            correct = sum(1 for a in answers if a.is_correct == 1)
            wrong = sum(1 for a in answers if a.is_correct == 0)
            marks = sum((a.marks_awarded or 0) for a in answers)

            # determine result based on attempts/attempt records (prefer best percentage if attempts exist)
            attempts = session.query(Exam_Attempt).filter(Exam_Attempt.schedule_id == schedule_id, Exam_Attempt.user_id == uid).all()
            best_percentage = None
            result = ''
            if attempts:
                best_percentage = max((a.percentage or 0) for a in attempts)
                if pass_mark is not None:
                    result = 'Pass' if (best_percentage is not None and best_percentage >= pass_mark) else 'Fail'
                else:
                    result = 'Pass' if (best_percentage and best_percentage >= 50) else 'Fail'
            else:
                result = 'No Attempt'

            rows.append({
                'user_id': uid,
                'student_name': user.full_name,
                'questions_attempted': questions_attempted,
                'correct_answers': correct,
                'wrong_answers': wrong,
                'marks_obtained': marks,
                'result': result,
                'best_percentage': best_percentage
            })

        # filter by q
        if q:
            rows = [r for r in rows if q in (r['student_name'] or '').lower()]

        # sorting
        sort_by = args.get('sort_by', 'student_name')
        order = args.get('order', 'asc')
        reverse = (order.lower() == 'desc')
        try:
            rows.sort(key=lambda r: (r.get(sort_by) is None, r.get(sort_by)), reverse=reverse)
        except Exception:
            rows.sort(key=lambda r: r.get('student_name', '').lower())

        total = len(rows)
        start = (page - 1) * page_size
        end = start + page_size
        paged = rows[start:end]

        return {
            'statusMessage': 'User-wise report retrieved',
            'status': True,
            'data': {
                'items': paged,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        }, 200
    except Exception as e:
        print('Error generating user-wise report', e)
        return {"statusMessage": f"Error generating report: {str(e)}", "status": False}, 500


def get_exam_analytics(request):
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    args = getattr(request, 'args', {})
    schedule_id = args.get('schedule_id')
    if not schedule_id:
        return {"statusMessage": "Missing schedule_id", "status": False}, 400

    try:
        # fetch schedule and exam
        schedule = session.query(ExamSchedule).filter(ExamSchedule.schedule_id == schedule_id).first()
        if not schedule:
            return {"statusMessage": "Schedule not found", "status": False}, 404
        exam_id = schedule.exam_id

        # participants: distinct users who attempted
        participant_ids = session.query(Answer.user_id).filter(Answer.schedule_id == schedule_id).distinct().all()
        participant_count = len([p[0] for p in participant_ids])

        # build category report
        category_rows = []
        mappings = session.query(ExamMapping).filter(ExamMapping.exam_id == exam_id).all()
        for m in mappings:
            cat_id = m.category_id
            # total questions for this category in exam
            # prefer explicit question mapping if present
            qids = session.query(ExamQuestionMapping.question_id).filter(ExamQuestionMapping.exam_id == exam_id, ExamQuestionMapping.category_id == cat_id).distinct().all()
            qids = [q[0] for q in qids]
            total_questions = len(qids) if qids else (m.number_of_questions or 0)

            # wrong answers for these questions in this schedule
            wrong_answers = 0
            total_attempts = 0
            if qids:
                wrong_answers = session.query(func.count(Answer.answer_id)).filter(Answer.schedule_id == schedule_id, Answer.question_id.in_(qids), Answer.is_correct == 0).scalar() or 0
                total_attempts = session.query(func.count(Answer.answer_id)).filter(Answer.schedule_id == schedule_id, Answer.question_id.in_(qids)).scalar() or 0

            error_percentage = (wrong_answers / total_attempts * 100) if total_attempts > 0 else 0

            # impact percentage heuristic: wrong answers normalized by (total_questions * participant_count)
            denom = (total_questions * participant_count) if (total_questions and participant_count) else 0
            impact_percentage = (wrong_answers / denom * 100) if denom > 0 else 0

            # category name
            cat_obj = session.query(Question).join(ExamQuestionMapping, Question.question_id == ExamQuestionMapping.question_id).filter(ExamQuestionMapping.category_id == cat_id).first()
            # fallback to categories table name lookup
            category_name = None
            try:
                from db.models import Categories
                cat = session.query(Categories).filter(Categories.category_id == cat_id).first()
                if cat:
                    category_name = cat.name
            except Exception:
                category_name = None

            category_rows.append({
                'category_id': cat_id,
                'category_name': category_name or str(cat_id),
                'total_questions': total_questions,
                'no_of_students': participant_count,
                'wrong_answers': int(wrong_answers),
                'error_percentage': round(error_percentage,2),
                'impact_percentage': round(impact_percentage,2)
            })

        # question summary
        question_summary = []
        # gather all question ids for the exam
        qmap = session.query(ExamQuestionMapping).filter(ExamQuestionMapping.exam_id == exam_id).all()
        question_ids = [qm.question_id for qm in qmap]
        # include mapping number_of_questions for randomize cases by pulling questions from QuestionMapping if necessary
        for idx, qid in enumerate(question_ids, start=1):
            qobj = session.query(Question).filter(Question.question_id == qid).first()
            if not qobj:
                continue
            attempts = session.query(func.count(Answer.answer_id)).filter(Answer.schedule_id == schedule_id, Answer.question_id == qid).scalar() or 0
            mistakes = session.query(func.count(Answer.answer_id)).filter(Answer.schedule_id == schedule_id, Answer.question_id == qid, Answer.is_correct == 0).scalar() or 0
            error_pct = (mistakes / attempts * 100) if attempts > 0 else 0
            question_summary.append({
                'sno': idx,
                'question_id': qid,
                'question_text': qobj.question_text,
                'attempts': int(attempts),
                'mistakes': int(mistakes),
                'error_percentage': round(error_pct,2)
            })

        # wrong answer analysis: per question distribution
        wrong_answer_distribution = []
        for q in question_summary:
            qid = q['question_id']
            # aggregate selected options for this question
            opt_counts = session.query(Option.options_id, Option.option_text, func.count(Answer.answer_id)).join(Answer, Answer.selected_option_id == Option.options_id).filter(Answer.schedule_id == schedule_id, Answer.question_id == qid).group_by(Option.options_id).all()
            total_sel = sum([c[2] for c in opt_counts])
            dist = []
            for opt_id, opt_text, cnt in opt_counts:
                pct = (cnt / total_sel * 100) if total_sel > 0 else 0
                dist.append({ 'option_id': opt_id, 'option_text': opt_text, 'count': int(cnt), 'percentage': round(pct,2) })
            wrong_answer_distribution.append({ 'question_id': qid, 'question_text': q['question_text'], 'distribution': dist })

        result = {
            'statusMessage': 'Analytics generated',
            'status': True,
            'data': {
                'category_report': category_rows,
                'question_summary': question_summary,
                'wrong_answer_distribution': wrong_answer_distribution
            }
        }
        return result, 200
    except Exception as e:
        print('Error generating analytics', e)
        return {"statusMessage": f"Error generating analytics: {str(e)}", "status": False}, 500


def get_question_wrong_answers(request):
    """Return detailed wrong answer distribution for a specific question within a schedule.
    Accepts query params: schedule_id, question_id
    """
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    args = getattr(request, 'args', {})
    schedule_id = args.get('schedule_id')
    question_id = args.get('question_id')
    if not schedule_id or not question_id:
        return {"statusMessage": "Missing schedule_id or question_id", "status": False}, 400

    try:
        # aggregate selected options and raw answers for this question
        opt_counts = session.query(Option.options_id, Option.option_text, func.count(Answer.answer_id)).join(Answer, Answer.selected_option_id == Option.options_id).filter(Answer.schedule_id == schedule_id, Answer.question_id == question_id).group_by(Option.options_id).all()
        total_sel = sum([c[2] for c in opt_counts])
        distribution = []
        for opt_id, opt_text, cnt in opt_counts:
            pct = (cnt / total_sel * 100) if total_sel > 0 else 0
            distribution.append({ 'option_id': opt_id, 'option_text': opt_text, 'count': int(cnt), 'percentage': round(pct,2) })

        # also include raw wrong selected texts in case free-text answers were stored
        raw_wrong = session.query(Answer.written_answer, func.count(Answer.answer_id)).filter(Answer.schedule_id == schedule_id, Answer.question_id == question_id, Answer.is_correct == 0).group_by(Answer.written_answer).all()
        raw_list = []
        for txt, cnt in raw_wrong:
            raw_list.append({'text': txt, 'count': int(cnt)})

        return {'statusMessage': 'Question wrong answers retrieved', 'status': True, 'data': { 'question_id': question_id, 'distribution': distribution, 'raw': raw_list }}, 200
    except Exception as e:
        print('Error fetching question wrong answers', e)
        return {"statusMessage": f"Error fetching wrong answers: {str(e)}", "status": False}, 500


def get_resources_for_answer(request):
    """Return list of resources mapped to an answer, option or question.
    Query params accepted: answer_id, option_id, question_id
    """
    db = SQLiteDB()
    session = db.connect()
    if not session:
        return {"statusMessage": "Error connecting to database", "status": False}, 500

    args = getattr(request, 'args', {})
    schedule_id = args.get('schedule_id', None)
    option_id = args.get('option_id', None)
    answer_id = args.get('answer_id', None)
    question_id = args.get('question_id', None)
    answer_value = args.get('answer_value', None)

    try:
        # validate schedule_id
        if not schedule_id:
            return {"statusMessage": "Missing schedule_id", "status": False}, 400

        # build query based on provided identifiers
        q = session.query(Answer)
        q = q.filter(Answer.schedule_id == schedule_id, Answer.is_correct == 0)

        if answer_id:
            q = q.filter(Answer.answer_id == answer_id)
        elif option_id:
            q = q.filter(Answer.selected_option_id == option_id)
        elif answer_value:
            # exact match for written answer
            if question_id:
                q = q.filter(Answer.question_id == question_id)
            q = q.filter(Answer.written_answer == answer_value)
        elif question_id:
            q = q.filter(Answer.question_id == question_id)
        else:
            return {"statusMessage": "Missing identifier (answer_id or option_id or question_id or answer_value)", "status": False}, 400

        answers = q.all()
        if not answers:
            return {"statusMessage": "No answers found for given parameters", "status": False}, 404

        # return users who selected that wrong answer (as a temporary resource summary)
        user_ids = list({ a.user_id for a in answers })
        users = session.query(User).filter(User.user_id.in_(user_ids)).all()
        out = []
        for user in users:
            out.append({ 'user_id': user.user_id, 'full_name': user.full_name, 'email': user.email })

        # include some context in response
        context = { 'schedule_id': schedule_id, 'question_id': question_id, 'option_id': option_id, 'answer_id': answer_id, 'answer_value': answer_value }
        return { 'statusMessage': 'Resources (users) retrieved', 'status': True, 'context': context, 'data': out }, 200
    except Exception as e:
        print('Error fetching resources for answer', e)
        return {"statusMessage": f"Error fetching resources: {str(e)}", "status": False}, 500
