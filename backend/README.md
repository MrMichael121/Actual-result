<!-- README.md for Python Backend -->
# Edu Assessment App - Backend
This is the backend component of the Edu Assessment App, built using Python and Flask. It provides RESTful APIs for managing educational assessments, user authentication, and data storage.
## Features
- User registration and authentication
- Institute management
- Assessment creation and management
- Result tracking and reporting
- Pagination support for user listings
## Technologies Used
- Python
- Flask
- SQLAlchemy
- SQLite (or any other database supported by SQLAlchemy)
- JWT for authentication
## Setup Instructions
1. Clone the repository:
   ```bash
   git clone
     git clone https://github.com/yourusername/edu-assessment-app.git
     cd edu-assessment-app/backend
     ```
2. Create a virtual environment and activate it:
   ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows use `venv\Scripts\activate`
     ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```