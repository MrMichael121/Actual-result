import uuid
from sqlalchemy import (
     Column, Date, String, Integer, Boolean, DateTime, ForeignKey, Text, CheckConstraint, UniqueConstraint, Float
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

def generate_uuid():
     return str(uuid.uuid4())

class Institute(Base):
     __tablename__ = 'Institutes'
     institute_id = Column(String, primary_key=True, default=generate_uuid)
     name = Column(String, nullable=False)
     short_name = Column(String)
     address = Column(String)
     country = Column(String)
     city = Column(String)
     state = Column(String)
     pincode = Column(Integer)
     email = Column(String)
     contact_no = Column(String)
     active_status = Column(Integer, default=1)

     primary_contact_person = Column(String)
     primary_contact_email = Column(String)
     primary_contact_phone = Column(String)
     website = Column(String)
     industry_type = Column(String)
     industry_sector = Column(String)
     max_users = Column(Integer, default=0)
     subscription_start = Column(Date)
     subscription_end = Column(Date)

     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

     users = relationship("User", back_populates="institute")
     exams = relationship("Exam", back_populates="institute")

class Country(Base):
     __tablename__ = 'Countries'
     country_id = Column(String, primary_key=True, default=generate_uuid)
     country_name = Column(String, nullable=False)
     iso2 = Column(String, nullable=False, unique=True)
     iso3 = Column(String, nullable=False, unique=True)
     phone_code = Column(String, nullable=False)
     currency_code = Column(String, nullable=False)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class State(Base):
     __tablename__ = 'States'
     state_id = Column(String, primary_key=True, default=generate_uuid)
     state_name = Column(String, nullable=False)
     state_code = Column(String)
     country_id = Column(String, ForeignKey('Countries.country_id'), nullable=False)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class City(Base):
     __tablename__ = 'Cities'
     city_id = Column(String, primary_key=True, default=generate_uuid)
     city_name = Column(String, nullable=False)
     city_code = Column(String)
     state_id = Column(String, ForeignKey('States.state_id'))
     country_id = Column(String, ForeignKey('Countries.country_id'))
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class InstituteCampus(Base):
     __tablename__ = 'InstituteCampuses'
     campus_id = Column(String, primary_key=True, default=generate_uuid)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'), nullable=False)
     name = Column(String, nullable=False)
     address = Column(String)
     country_id = Column(String, ForeignKey('Countries.country_id'))
     state_id = Column(String, ForeignKey('States.state_id'))
     city_id = Column(String, ForeignKey('Cities.city_id'))
     email = Column(String)
     phone = Column(String)
     pin_code = Column(String)
     is_primary = Column(Boolean, default=0)
     active_status = Column(Boolean, default=1)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class InstituteDepartment(Base):
     __tablename__ = 'InstituteDepartments'
     department_id = Column(String, primary_key=True, default=generate_uuid)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'), nullable=False)
     name = Column(String, nullable=False)
     active_status = Column(Integer, default=1)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class InstituteTeam(Base):
     __tablename__ = 'InstituteTeams'
     team_id = Column(String, primary_key=True, default=generate_uuid)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'), nullable=False)
     name = Column(String, nullable=False)
     active_status = Column(Integer, default=1)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class IndustryType(Base):
     __tablename__ = 'IndustryTypes'
     type_id = Column(String, primary_key=True, default=generate_uuid)
     name = Column(String, nullable=False, unique=True)

class IndustrySector(Base):
     __tablename__ = 'IndustrySectors'
     sector_id = Column(String, primary_key=True, default=generate_uuid)
     type_id = Column(String, ForeignKey('IndustryTypes.type_id'), nullable=False)
     name = Column(String, nullable=False)

class Page(Base):
     __tablename__ = 'Pages'
     page_id = Column(String, primary_key=True, default=generate_uuid)
     page_name = Column(String, nullable=False, unique=True)
     page_url = Column(String, nullable=False)
     parent_page_id = Column(String, ForeignKey('Pages.page_id'))
     menu_order = Column(Integer, default=0)
     icon_class = Column(String)
     description = Column(String)
     active_status = Column(Integer, default=1)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class UserPageAccess(Base):
     __tablename__ = 'UserPageAccess'
     access_id = Column(String, primary_key=True, default=generate_uuid)
     user_id = Column(String, ForeignKey('Users.user_id'), nullable=False)
     page_id = Column(String, ForeignKey('Pages.page_id'), nullable=False)
     can_view = Column(Integer, default=0)
     can_add = Column(Integer, default=0)
     can_edit = Column(Integer, default=0)
     can_delete = Column(Integer, default=0)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)
	# UniqueConstraint('user_id', 'page_id', name='uix_user_page')

class User(Base):
     __tablename__ = 'Users'
     user_id = Column(String, primary_key=True, default=generate_uuid)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'))
     full_name = Column(String, nullable=False)
     user_name = Column(String, unique=True, nullable=False)
     email = Column(String, unique=True, nullable=False)
     user_role = Column(String, CheckConstraint("user_role IN ('super_admin', 'admin', 'user')"), nullable=False)
     contact_no = Column(String)
     department_id = Column(String,  ForeignKey('InstituteDepartments.department_id'))
     team_id = Column(String, ForeignKey('InstituteTeams.team_id'))
     campus_id = Column(String, ForeignKey('InstituteCampuses.campus_id'))
     country_id = Column(String, ForeignKey('Countries.country_id'))
     state_id = Column(String, ForeignKey('States.state_id'))
     city_id = Column(String, ForeignKey('Cities.city_id'))
     contact_no = Column(String)
     joining_date = Column(DateTime)
     active_status = Column(Integer, default=1)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

     institute = relationship("Institute", back_populates="users")
     credentials = relationship("Credential", uselist=False, back_populates="user")
     sessions = relationship("AppSession", back_populates="user")
     answers = relationship("Answer", back_populates="user")

class Credential(Base):
     __tablename__ = 'Credentials'
     id = Column(String, primary_key=True, default=generate_uuid)
     user_id = Column(String, ForeignKey('Users.user_id'), unique=True, nullable=False)
     password_hash = Column(String, nullable=False)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)

     user = relationship("User", back_populates="credentials")

class AppSession(Base):
     __tablename__ = 'App_Session'
     id = Column(String, primary_key=True, default=generate_uuid)
     user_id = Column(String, ForeignKey('Users.user_id'), nullable=False)
     token = Column(String, nullable=False)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     expires_at = Column(DateTime)

     user = relationship("User", back_populates="sessions")

class Exam(Base):
     __tablename__ = 'Exams'
     exam_id = Column(String, primary_key=True, default=generate_uuid)
     title = Column(String, nullable=False)
     description = Column(String)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'), nullable=False)
     duration_mins = Column(Integer, default=10)
     total_questions = Column(Integer, default=0)
     number_of_attempts = Column(Integer, default=1)
     pass_mark = Column(Integer)
     start_time = Column(DateTime)
     end_time = Column(DateTime)
     published = Column(Integer, default=0)
     public_access = Column(Integer, default=0)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

     institute = relationship("Institute", back_populates="exams")
    #  questions = relationship("Question", back_populates="exam")
    #  answers = relationship("Answer", back_populates="exam")

class ExamMapping(Base):
     __tablename__ = 'ExamMapping'
     mapping_id = Column(String, primary_key=True, default=generate_uuid)
     exam_id = Column(String, ForeignKey('Exams.exam_id'), nullable=False)
     category_id = Column(String, ForeignKey('Categories.category_id'), nullable=False)
     number_of_questions = Column(Integer)
     randomize_questions = Column(Integer)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class ExamQuestionMapping(Base):
     __tablename__ = 'exam_question_mapping'
     map_id = Column(String, primary_key=True, default=generate_uuid)
     exam_id = Column(String, ForeignKey('Exams.exam_id'), nullable=False)
     category_id = Column(String, ForeignKey('Categories.category_id'))
     question_id = Column(String, ForeignKey('Questions.question_id'), nullable=False)    
     order_number = Column(Integer)
     

class ExamSchedule(Base):
     __tablename__ = 'ExamSchedules'
     schedule_id = Column(String, primary_key=True, default=generate_uuid)
     exam_id = Column(String, ForeignKey('Exams.exam_id'), nullable=False)
     title = Column(String)
     institute_id = Column(String, ForeignKey('Institutes.institute_id'), nullable=True)
     start_time = Column(DateTime, nullable=False)
     end_time = Column(DateTime, nullable=False)
     duration_mins = Column(Integer, default=10)
     total_questions = Column(Integer, default=0)
     pass_mark = Column(Integer, default=0)
     number_of_attempts = Column(Integer, default=1)
     published = Column(Integer, default=0)
     user_review = Column(Integer, default=0)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class ExamScheduleMapping(Base):
    __tablename__ = 'ExamScheduleMapping'
    mapping_id = Column(String, primary_key=True, default=generate_uuid)
    schedule_id = Column(String, ForeignKey('ExamSchedules.schedule_id'), nullable=False)
    user_id = Column(String, ForeignKey('Users.user_id'))
    department_id = Column(String, ForeignKey('InstituteDepartments.department_id'))
    team_id = Column(String, ForeignKey('InstituteTeams.team_id'))
    campus_id = Column(String, ForeignKey('InstituteCampuses.campus_id'))
    created_by = Column(String)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by = Column(String)
    updated_date = Column(DateTime)

    # # -- ensure exactly one target (user OR department OR team OR campus) is set
    # CHECK (
    #     (user_id IS NOT NULL) + (department_id IS NOT NULL) + (team_id IS NOT NULL) + (campus_id IS NOT NULL) = 1
    # ),
    # # -- prevent duplicate mappings for same schedule and target
    # UNIQUE(schedule_id, user_id, department_id, team_id, campus_id)


class Question(Base):
     __tablename__ = 'Questions'
     question_id = Column(String, primary_key=True, default=generate_uuid)
    #  institute_id = Column(String, ForeignKey('Institutes.institute_id'))
    #  exam_id = Column(String, ForeignKey('Exam.exam_id'))
     question_text = Column(Text, nullable=False)
     question_type = Column(String, CheckConstraint("question_type IN ('choose', 'multi', 'fill', 'descriptive', 'paragraph')"), nullable=False)
     marks = Column(Integer, default=1)
     order_number = Column(Integer)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

    #  exam = relationship("Exam", back_populates="questions")
     options = relationship("Option", back_populates="question")
     answers = relationship("Answer", back_populates="question")

class QuestionMapping(Base):
     __tablename__ = 'QuestionMapping'
     map_id = Column(String, primary_key=True, default=generate_uuid)
     question_id = Column(String, ForeignKey('Questions.question_id'), nullable=False)
     category_id = Column(String, ForeignKey('Categories.category_id'), nullable=False)
     created_by = Column(String)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)
     updated_by = Column(String)
     updated_date = Column(DateTime)

class Option(Base):
     __tablename__ = 'Options'
     options_id = Column(String, primary_key=True, default=generate_uuid)
     question_id = Column(String, ForeignKey('Questions.question_id'), nullable=False)
     option_text = Column(Text, nullable=False)
     is_correct = Column(Integer, default=0)
     active_status = Column(Integer, default=1)

     question = relationship("Question", back_populates="options")
     answers = relationship("Answer", back_populates="selected_option")

class Answer(Base):
     __tablename__ = 'Answers'
     answer_id = Column(String, primary_key=True, default=generate_uuid)
     user_id = Column(String, ForeignKey('Users.user_id'), nullable=False)
     schedule_id = Column(String, ForeignKey('ExamSchedules.schedule_id'), nullable=False)
     attempt_id = Column(String, ForeignKey('Exam_Attempts.attempt_id'), nullable=False)
     question_id = Column(String, ForeignKey('Questions.question_id'), nullable=False)
     selected_option_id = Column(String, ForeignKey('Options.options_id'))
     written_answer = Column(Text)
     is_correct = Column(Integer)
     marks_awarded = Column(Integer, default=0)
     is_validated = Column(Integer, default=0)
     feedback = Column(Text)
     created_date = Column(DateTime, default=datetime.datetime.utcnow)

     user = relationship("User", back_populates="answers")
    #  exam = relationship("Exam", back_populates="answers")
     question = relationship("Question", back_populates="answers")
     selected_option = relationship("Option", back_populates="answers")

class Exam_Attempt(Base):
    __tablename__ = 'Exam_Attempts'
    attempt_id = Column(String, primary_key=True, default=generate_uuid)
    schedule_id = Column(String, ForeignKey('ExamSchedules.schedule_id'), nullable=False)
    user_id = Column(String, ForeignKey('Users.user_id'), nullable=False)
    attempt_number = Column(Integer, default=1)
    started_date = Column(DateTime)
    submitted_date = Column(DateTime)
    status = Column(String, CheckConstraint("status IN ('not_started', 'in_progress', 'submitted', 'evaluated')"), default='not_started')
    score = Column(Integer, default=0)
    percentage = Column(Float)
    feedback = Column(Text)

class Categories(Base):
    __tablename__ = 'Categories'
    category_id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    institute_id = Column(String, ForeignKey('Institutes.institute_id'))
    type = Column(String)
    answer_by = Column(String)
    evaluation = Column(String)
    active_status = Column(Integer, default=1)
    mark_each_question = Column(Integer)
    public_access = Column(Integer, default=0)
    created_by = Column(String)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by = Column(String)
    updated_date = Column(DateTime)

class CategoriesDepartments(Base):
    __tablename__ = 'CategoriesDepartments'
    id = Column(String, primary_key=True, default=generate_uuid)
    department_id = Column(String)
    category_id = Column(String, ForeignKey('Categories.category_id'), nullable=False)
    name = Column(String)
    active_status = Column(Integer, default=1)
    created_by = Column(String)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by = Column(String)
    updated_date = Column(DateTime)

class CategoriesTeams(Base):
    __tablename__ = 'CategoriesTeams'
    id = Column(String, primary_key=True, default=generate_uuid)
    team_id = Column(String)
    category_id = Column(String, ForeignKey('Categories.category_id'), nullable=False)
    name = Column(String)
    active_status = Column(Integer, default=1)
    created_by = Column(String)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by = Column(String)
    updated_date = Column(DateTime)