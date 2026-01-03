# Python flask API file for edu using SQLAlchemy

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

class SQLiteDB:
    def __init__(self):
        import os
        db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'edu.db')
        db_path = f'sqlite:///{db_dir}'
        os.makedirs(os.path.dirname(db_dir), exist_ok=True)
        self.engine = create_engine(db_path, echo=False, future=True)
        self.Session = sessionmaker(bind=self.engine)
        self.session = None

    def connect(self):
        if self.session:
            return self.session
        try:
            self.session = self.Session()
            return self.session
        except Exception as e:
            print(f"Error connecting to the database: {e}")
            return None

    def execute_query(self, query, params=None):
        if not self.session:
            self.connect()
        if not self.session:
            print("No database session available.")
            return None
        try:
            stmt = text(query)
            if params:
                result = self.session.execute(stmt, params)
            else:
                result = self.session.execute(stmt)
            self.session.commit()
            if query.strip().lower().startswith("select"):
                return result.fetchall()
            else:
                return None
        except Exception as e:
            print(f"Error executing query: {e}")
            self.session.rollback()
            return None

    def close(self):
        if self.session:
            self.session.close()
            self.session = None
