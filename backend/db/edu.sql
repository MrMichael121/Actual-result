-- -- SQLite
-- -- Table: select * from Institutes
-- drop table Institutes
-- CREATE TABLE Institutes (
--     institute_id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     short_name TEXT,

--     primary_contact_person TEXT,
--     primary_contact_email TEXT,
--     primary_contact_phone TEXT,
--     website TEXT

--     industry_type TEXT,
--     industry_sector TEXT,

--     active_status INTEGER DEFAULT 1,
--     max_users INTEGER DEFAULT 0,


--     subscription_start DATE,
--     subscription_end DATE,

--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME
-- );


-- TABLE: Countries
-- drop table Countries
-- CREATE TABLE Countries (
-- 	country_id TEXT PRIMARY KEY,
-- 	country_name TEXT NOT NULL,
--     	iso2 TEXT NOT NULL UNIQUE,
--     	iso3 TEXT NOT NULL UNIQUE, 
-- 	phone_code TEXT NOT NULL,
-- 	currency_code TEXT NOT NULL,
-- 	created_by TEXT,
-- 	created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 	updated_by TEXT,
-- 	updated_date DATETIME
-- );
-- INSERT INTO Countries (country_id, country_name, iso2, iso3, phone_code, currency_code, created_by)
-- VALUES
-- ('uuid-india', 'India', 'IN', 'IND', '+91', 'INR','system'),


-- Table: States
-- drop table States
-- CREATE TABLE States (
-- 	state_id TEXT PRIMARY KEY,
-- 	state_name TEXT NOT NULL,
-- 	state_code TEXT,
-- 	country_id TEXT NOT NULL,
-- 	created_by TEXT,
-- 	created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 	updated_by TEXT,
-- 	updated_date DATETIME,

-- 	FOREIGN KEY (country_id) REFERENCES Countries(country_id)
-- );
-- INSERT INTO States (state_id, state_name, state_code, country_id, created_by)
-- VALUES
-- ( 'uuid-india-mh', 'Maharashtra', 'MH', 'uuid-india', 'system'),
-- ( 'uuid-india-dl', 'Delhi', 'DL', 'uuid-india', 'system'),



-- Table: Cities
-- drop table Cities
-- CREATE TABLE Cities (
-- 	city_id TEXT PRIMARY KEY,
-- 	city_name TEXT NOT NULL,
-- 	city_code TEXT,
-- 	state_id TEXT,
-- 	country_id TEXT,
-- 	created_by TEXT,
-- 	created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 	updated_by TEXT,
-- 	updated_date DATETIME,

-- 	FOREIGN KEY (state_id) REFERENCES States(state_id),
-- 	FOREIGN KEY (country_id) REFERENCES Countries(country_id)
-- );


-- Add foreign key constraint for country_id (SQLite does not support adding FK via ALTER TABLE directly, so you need to recreate the table if strict FK is needed)
-- For reference:
-- FOREIGN KEY (country_id) REFERENCES Countries(country_id)

-- INSERT INTO Cities ( city_id, city_name, city_code, state_id, created_by)
-- VALUES
-- ( 'uuid-india-chn', 'Chennai', 'CHN', 'uuid-india-tn', 'system'),
-- ( 'uuid-india-tri', 'Trichy', 'TRI', 'uuid-india-tn', 'system'),

-- DROP TABLE InstituteCampuses
-- CREATE TABLE InstituteCampuses (
--     campus_id TEXT PRIMARY KEY,
--     institute_id TEXT NOT NULL,
--     name TEXT NOT NULL,

--     address TEXT,
--     country_id TEXT,
--     state_id TEXT,
--     city_id TEXT,
--     pin_code TEXT,
--     email TEXT,
--     phone TEXT,

--     is_primary BOOLEAN DEFAULT 0,
--     active_status BOOLEAN DEFAULT 1,

--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id),
--     FOREIGN KEY (country_id) REFERENCES Countries(country_id),
--     FOREIGN KEY (state_id) REFERENCES States(state_id),
--     FOREIGN KEY (city_id) REFERENCES Cities(city_id)
-- );

-- CREATE TABLE InstituteDepartments (
--     department_id TEXT PRIMARY KEY,
--     institute_id TEXT NOT NULL,
--     name TEXT NOT NULL,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id)
-- );


-- CREATE TABLE InstituteTeams (
--     team_id TEXT PRIMARY KEY,
--     institute_id TEXT NOT NULL,
--     name TEXT NOT NULL,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id)
-- );

-- CREATE TABLE DepartmentMaster (
--     department_id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME
-- );


-- CREATE TABLE TeamMaster (
--     team_id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME
-- );

-- CREATE TABLE IndustryTypes (
--     type_id TEXT PRIMARY KEY,
--     name TEXT NOT NULL UNIQUE
-- );

-- CREATE TABLE IndustrySectors (
--     sector_id TEXT PRIMARY KEY,
--     type_id TEXT NOT NULL,
--     name TEXT NOT NULL,

--     FOREIGN KEY (type_id) REFERENCES IndustryTypes(type_id)
-- );

-- CREATE TABLE Pages (application pages master for user access control)
-- SELECT * FROM Pages;
-- DROP TABLE Pages;
-- CREATE TABLE Pages (
-- 	page_id TEXT PRIMARY KEY,
-- 	page_name TEXT NOT NULL UNIQUE,
-- 	page_url TEXT NOT NULL,
-- 	parent_page_id TEXT,
-- 	menu_order INTEGER DEFAULT 0,
-- 	icon_class TEXT,
-- 	description TEXT,
-- 	active_status INTEGER DEFAULT 1,
-- 	created_by TEXT,
-- 	created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 	updated_by TEXT,
-- 	updated_date DATETIME,
	
-- 	FOREIGN KEY (parent_page_id) REFERENCES Pages(page_id)
-- );
-- delete from Pages;
-- INSERT INTO Pages (page_id, page_name, page_url)
-- VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', 'User', '/user'),
-- ('550e8400-e29b-41d4-a716-446655440002', 'Category', '/category'),
-- ('550e8400-e29b-41d4-a716-446655440003', 'Question', '/question'),
-- ('550e8400-e29b-41d4-a716-446655440004', 'Exam', '/exam'),
-- ('550e8400-e29b-41d4-a716-446655440005', 'Schedule', '/schedule');

-- CREATE TABLE UserPageAccess (user access control for pages)
-- SELECT * FROM UserPageAccess;
-- DROP TABLE UserPageAccess;
-- CREATE TABLE UserPageAccess (
-- 	access_id TEXT PRIMARY KEY,
-- 	user_id TEXT NOT NULL,
-- 	page_id TEXT NOT NULL,
-- 	can_view INTEGER DEFAULT 0,
-- 	can_add INTEGER DEFAULT 0,
-- 	can_edit INTEGER DEFAULT 0,
-- 	can_delete INTEGER DEFAULT 0,
-- 	created_by TEXT,
-- 	created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
-- 	updated_by TEXT,
-- 	updated_date DATETIME,
	
-- 	FOREIGN KEY (user_id) REFERENCES Users(user_id),
-- 	FOREIGN KEY (page_id) REFERENCES Pages(page_id),
-- 	UNIQUE(user_id, page_id)
-- );




-- -- Table: Users
-- drop table Users
-- CREATE TABLE Users (
--     user_id TEXT PRIMARY KEY, -- UUID
--     institute_id TEXT,
--     full_name TEXT NOT NULL,
--     user_name TEXT NOT NULL,
--     email TEXT UNIQUE NOT NULL,
--     user_role TEXT CHECK(user_role IN ('super_admin', 'admin', 'user')) NOT NULL,
--     department_id TEXT,
--     team_id TEXT,
--     campus_id TEXT
--     country_id TEXT,
--     state_id TEXT,
--     city_id TEXT,
--     contact_no TEXT,
--     joining_date DATETIME,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,
--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id),
--     FOREIGN KEY (department_id) REFERENCES InstituteDepartments(dept_id),
--     FOREIGN KEY (team_id) REFERENCES InstituteTeams(team_id),
--     FOREIGN KEY (campus_id) REFERENCES InstituteCampuses(campus_id),
--     FOREIGN KEY (country_id) REFERENCES Countries(country_id),
--     FOREIGN KEY (state_id) REFERENCES States(state_id),
--     FOREIGN KEY (city_id) REFERENCES Cities(city_id)
-- );


-- -- Table: Credentials
-- CREATE TABLE Credentials (
--     id TEXT PRIMARY KEY, -- UUID
--     user_id TEXT UNIQUE NOT NULL,
--     password_hash TEXT NOT NULL,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES Users(user_id)
-- );

-- -- Table: App_Session
-- CREATE TABLE App_Session (
--     id TEXT PRIMARY KEY, -- UUID
--     user_id TEXT NOT NULL,
--     token TEXT NOT NULL,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     expires_at DATETIME,
--     FOREIGN KEY (user_id) REFERENCES Users(user_id)
-- );

-- -- Table: SELECT * FROM Exams
-- drop TABLE Exams;
-- CREATE TABLE Exams (
--      exam_id TEXT PRIMARY KEY, 
--      title TEXT NOT NULL,
--      description TEXT,
--      institute_id TEXT NOT NULL,
--      duration_mins INTEGER DEFAULT 10,
--      total_questions INTEGER DEFAULT 0,
--      number_of_attempts INTEGER DEFAULT 1,
--      pass_mark INTEGER,
--      start_time DATETIME,
--      end_time DATETIME,
--      published INTEGER DEFAULT 0,
--      public_access INTEGER DEFAULT 0,
--      created_by TEXT,
--      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--      updated_by TEXT,
--      updated_date DATETIME,
--      FOREIGN KEY (institute_id) REFERENCES institutes(institute_id)
-- );

-- TABLE: SELECT * FROM ExamMapping;
-- DROP TABLE ExamMapping;
-- CREATE TABLE ExamMapping (
--     mapping_id TEXT PRIMARY KEY,
--     exam_id TEXT NOT NULL,
--     category_id TEXT NOT NULL,
--     number_of_questions INTEGER,
--     randomize_questions INTEGER,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (exam_id) REFERENCES Exams(exam_id),
--     FOREIGN KEY (category_id) REFERENCES Categories(category_id)
-- );

-- TABLE: ExamSchedules
-- DROP TABLE ExamSchedules;
-- CREATE TABLE ExamSchedules (
--     schedule_id TEXT PRIMARY KEY,
--     exam_id TEXT NOT NULL,
--     title TEXT,
--     institute_id TEXT,
--     start_time DATETIME NOT NULL,
--     end_time DATETIME NOT NULL,
--     duration_mins INTEGER DEFAULT 10,
--     total_questions INTEGER DEFAULT 0,
--     pass_mark INTEGER DEFAULT 0,
--     number_of_attempts INTEGER DEFAULT 1,
--     published INTEGER DEFAULT 0,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,
--     FOREIGN KEY (exam_id) REFERENCES Exams(exam_id),
--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id)
-- );

-- TABLE: ExamSchedules mapping for user wise or department or team or campas
-- CREATE TABLE ExamScheduleMapping (
--     mapping_id TEXT PRIMARY KEY,
--     schedule_id TEXT NOT NULL,
--     user_id TEXT,
--     department_id TEXT,
--     team_id TEXT,
--     campus_id TEXT,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (schedule_id) REFERENCES ExamSchedules(schedule_id),
--     FOREIGN KEY (user_id) REFERENCES Users(user_id),
--     FOREIGN KEY (department_id) REFERENCES InstituteDepartments(department_id),
--     FOREIGN KEY (team_id) REFERENCES InstituteTeams(team_id),
--     FOREIGN KEY (campus_id) REFERENCES InstituteCampuses(campus_id),

--     -- ensure exactly one target (user OR department OR team OR campus) is set
--     CHECK (
--         (user_id IS NOT NULL) + (department_id IS NOT NULL) + (team_id IS NOT NULL) + (campus_id IS NOT NULL) = 1
--     ),

--     -- prevent duplicate mappings for same schedule and target
--     UNIQUE(schedule_id, user_id, department_id, team_id, campus_id)
-- );

-- Table: Select * from Categories
-- drop table Categories;
-- CREATE TABLE Categories (
-- 	category_id TEXT PRIMARY KEY,
-- 	name TEXT NOT NULL UNIQUE,
-- 	description TEXT,
-- 	institute_id TEXT,
-- 	type TEXT,
-- 	answer_by TEXT,
-- 	evaluation TEXT,
-- 	active_status INTEGER DEFAULT 1,
-- 	mark_each_question INTEGER,
-- 	public_access INTEGER DEFAULT 0,
--     column1 TEXT,
--     column2 TEXT,
-- 	created_by TEXT,
-- 	created_date DATETIME,
-- 	updated_by TEXT,
-- 	updated_date DATETIME,

--     FOREIGN KEY (institute_id) REFERENCES Institutes(institute_id)
-- );

-- drop table CategoriesDepartments;
-- CREATE TABLE CategoriesDepartments (
--     id TEXT PRIMARY KEY,
--     department_id TEXT NOT NULL,
--     category_id TEXT NOT NULL,
--     name TEXT,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (category_id) REFERENCES Categories(category_id)
-- );

-- drop TABLE CategoriesTeams;
-- CREATE TABLE CategoriesTeams (
-- 	id TEXT PRIMARY KEY,
--     team_id TEXT NOT NULL,
--     category_id TEXT NOT NULL,
--     name TEXT,
--     active_status INTEGER DEFAULT 1,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (category_id) REFERENCES Categories(category_id)
-- );

-- -- Table: select * from Questions
-- drop table Questions;
-- CREATE TABLE Questions (
--     question_id TEXT PRIMARY KEY,
--     question_text TEXT NOT NULL,
--     question_type TEXT CHECK(question_type IN ('choose', 'multi', 'fill','descriptive', 'paragraph')) NOT NULL,
--     marks INTEGER DEFAULT 1,
--     order_number INTEGER,
--     column1 TEXT,
--     column2 TEXT,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME
-- );

-- Table: Select * from QuestionMapping
-- DROP TABLE QuestionMapping;
-- CREATE TABLE QuestionMapping (
--     map_id TEXT PRIMARY KEY,
--     question_id TEXT NOT NULL,
--     category_id TEXT NOT NULL,
--     created_by TEXT,
--     created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_by TEXT,
--     updated_date DATETIME,

--     FOREIGN KEY (question_id) REFERENCES questions(question_id),
--     FOREIGN KEY (category_id) REFERENCES categories(category_id)
-- );

-- SELECT * from exam_question_mapping;
-- DROP TABLE exam_question_mapping;
-- CREATE TABLE exam_question_mapping (
--     map_id TEXT PRIMARY KEY,
--     exam_id TEXT NOT NULL,
--     category_id TEXT,
--     question_id TEXT NOT NULL,
--     order_number INTEGER,
--     FOREIGN KEY (exam_id) REFERENCES exams(exam_id),
--     FOREIGN KEY (question_id) REFERENCES questions(question_id),
--     FOREIGN KEY (category_id) REFERENCES categories(category_id)
-- );
-- -- Table: Options (supports multiple correct answers)
-- DROP TABLE Options;
-- CREATE TABLE options (
--     option_id TEXT PRIMARY KEY,
--     question_id TEXT NOT NULL,
--     option_text TEXT NOT NULL,
--     is_correct INTEGER DEFAULT 0,
--     FOREIGN KEY (question_id) REFERENCES questions(question_id)
-- );
-- DROP TABLE exam_attempts;
-- CREATE TABLE exam_attempts (
--     attempt_id TEXT PRIMARY KEY,
--     schedule_id TEXT NOT NULL,
--     user_id TEXT NOT NULL,
--     attempt_number INTEGER DEFAULT 1,
--     started_date DATETIME,
--     submitted_date DATETIME,
--     status TEXT CHECK(status IN ('not_started', 'in_progress', 'submitted', 'evaluated')) DEFAULT 'not_started',
--     score INTEGER DEFAULT 0,
--     percentage REAL,
--     feedback TEXT,
--     FOREIGN KEY (schedule_id) REFERENCES examschedules(schedule_id),
--     FOREIGN KEY (user_id) REFERENCES users(user_id)
-- );

-- -- Table: SELECT * FROM Answers
-- DROP TABLE Answers;
-- CREATE TABLE Answers (
--      answer_id TEXT PRIMARY KEY,
--      user_id TEXT NOT NULL,
--      schedule_id TEXT NOT NULL,
--      attempt_id TEXT,
--      question_id TEXT NOT NULL,
--      selected_option_id TEXT, -- For multi-choice, allow multiple rows per question/user
--      written_answer TEXT,
--      is_correct INTEGER,
--      feedback TEXT,
--      marks_awarded INTEGER DEFAULT 0,
--      is_validated INTEGER DEFAULT 0,
--      created_date DATETIME DEFAULT CURRENT_TIMESTAMP,

--      FOREIGN KEY (attempt_id) REFERENCES exam_attempts(attempt_id),
--      FOREIGN KEY (user_id) REFERENCES users(user_id),
--      FOREIGN KEY (schedule_id) REFERENCES exam_schedules(schedule_id),
--      FOREIGN KEY (question_id) REFERENCES questions(question_id),
--      FOREIGN KEY (selected_option_id) REFERENCES options(option_id)
-- );


-- SQLite view all tables list and details
SELECT * FROM sqlite_master WHERE type='table';

SELECT * from Institutes;
SELECT * FROM Users;
SELECT * FROM Credentials;
SELECT * FROM App_Session;
SELECT * FROM Pages;
SELECT * FROM UserPageAccess;

SELECT ua.user_id, ua.page_id, p.page_name, ua.can_view, ua.can_add, ua.can_edit, ua.can_delete from UserPageAccess ua 
join pages p on p.page_id = ua.page_id


SELECT * FROM IndustryTypes;
SELECT * FROM IndustrySectors;
SELECT * FROM InstituteDepartments;
SELECT * FROM InstituteTeams;


-- Example: Delete rows created today (SQLite syntax)
-- DELETE FROM InstituteDepartments WHERE date(created_date) = date('now');
SELECT * FROM InstituteCampuses;


SELECT * FROM States;
SELECT * FROM Cities;
SELECT * FROM Countries;

-- Categories
SELECT * FROM Categories;


-- select * from Tests;
select * from Exams;
SELECT * FROM ExamMapping;
SELECT * FROM Questions ;
-- ALTER TABLE Questions RENAME COLUMN test_id TO exam_id;

SELECT * FROM  ExamSchedules;
-- DELETE FROM ExamSchedules where schedule_id='5b8ee942-7de1-44cc-bdee-88f301440044'

select * from Exam_Attempts WHERE attempt_id = '5b8ee942-7de1-44cc-bdee-88f301440044' ;
-- DELETE FROM exam_attempts WHERE attempt_id = 'c9ab1eb0-b933-4775-9258-2c078dd90ccf' ;

SELECT * from Answers WHERE attempt_id = 'c9ab1eb0-b933-4775-9258-2c078dd90ccf' and question_id = '5a717d8d-40c1-4808-921f-3aea00c9343a' and user_id = '6d3acbd7-5abb-4214-8943-b66750d0beff';
-- DELETE FROM Answers WHERE attempt_id = 'c9ab1eb0-b933-4775-9258-2c078dd90ccf' and question_id = '5a717d8d-40c1-4808-921f-3aea00c9343a' and user_id = '6d3acbd7-5abb-4214-8943-b66750d0beff';
-- update Answers set is_validated = 0 where attempt_id = 'fa188ab2-23df-4c13-8f0f-77b3f15811e1' and question_id = '5a717d8d-40c1-4808-921f-3aea00c9343a' and user_id = '6d3acbd7-5abb-4214-8943-b66750d0beff';
SELECT * FROM Options WHERE question_id = '52d36163-785f-48d8-9e92-5ea15fe286e3';


-- report of exam attempts and answers
SELECT ea.attempt_id, ea.user_id, ea.schedule_id, ea.attempt_number, ea.started_date, ea.submitted_date, ea.status, ea.score, ea.percentage,
	  q.question_id, q.question_text, q.question_type,
	  an.answer_id, an.selected_option_id, an.written_answer, an.is_correct, an.marks_awarded
FROM exam_attempts ea
JOIN Answers an ON ea.attempt_id = an.attempt_id
JOIN Questions q ON an.question_id = q.question_id
WHERE ea.schedule_id = 'cdb1341a-bd79-4295-8944-40e1533ae394'
  AND ea.user_id = '6d3acbd7-5abb-4214-8943-b66750d0beff';



-- delete from Exam_Attempts;
-- delete from Answers;



-- Update mark for choose questions
UPDATE Answers
SET is_correct = 1,is_validated = 1,
	marks_awarded = (SELECT q.marks FROM Questions q
		WHERE q.question_id = Answers.question_id )
WHERE answer_id IN (
	SELECT an.answer_id
	FROM Answers an
	JOIN Questions q ON an.question_id = q.question_id
	JOIN Options o ON q.question_id = o.question_id
	WHERE q.question_type = 'choose'
	  AND an.selected_option_id = o.options_id
       AND o.is_correct = 1
	  AND an.is_validated = 0
);

SELECT an.*
FROM Answers an
JOIN Questions q ON an.question_id = q.question_id
JOIN Options o ON q.question_id = o.question_id
WHERE q.question_type = 'multi'
     AND an.selected_option_id = o.options_id
     AND o.is_correct = 1
     AND an.is_validated = 0



-- Reset Exam creation
Exams
ExamMapping
exam_question_mapping

-- Reset tables data - Clear all data from tables

-- -- Clear session and authentication data first
-- DELETE FROM App_Session;
-- DELETE FROM Credentials;

-- -- Clear exam attempt and answer data
-- DELETE FROM Answers;
-- DELETE FROM exam_attempts;

-- -- Clear exam mapping and question data
-- DELETE FROM exam_question_mapping;
-- DELETE FROM ExamMapping;
-- DELETE FROM Exams;


-- DELETE FROM Options;
-- DELETE FROM QuestionMapping;
-- DELETE FROM Questions;

-- -- Clear exam and schedule data
-- DELETE FROM ExamScheduleMapping;
-- DELETE FROM ExamSchedules;


-- -- Clear category mappings
-- DELETE FROM CategoriesTeams;
-- DELETE FROM CategoriesDepartments;
-- DELETE FROM Categories;

-- -- Clear user data
-- DELETE FROM Users;

-- -- Clear institute structure data
-- DELETE FROM InstituteCampuses;
-- DELETE FROM InstituteTeams;
-- DELETE FROM InstituteDepartments;
-- DELETE FROM Institutes;

-- -- Clear location data
-- DELETE FROM Cities;
-- DELETE FROM States;
-- DELETE FROM Countries;

-- -- Clear master data
-- DELETE FROM IndustrySectors;
-- DELETE FROM IndustryTypes;
-- DELETE FROM TeamMaster;
-- DELETE FROM DepartmentMaster;

-- -- Reset SQLite sequence counters (if any tables use AUTOINCREMENT)
-- DELETE FROM sqlite_sequence;

-- Verify all tables are empty
SELECT name FROM sqlite_master WHERE type='table';
-- 
select * from Institutes;
-- update Institutes set industry_sector = 'Arts' where industry_type = 'College' and name in('Madras Arts College','Velammal Arts & Science College') ;