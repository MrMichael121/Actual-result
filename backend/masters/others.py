from db.db import SQLiteDB
from db.models import Page, UserPageAccess

def get_pages_list(request):

    db = SQLiteDB()
    session = db.connect()
    if not session:
        return None

    page_details = session.query(Page).all()
    page_data = []
    for page in page_details:
        page_data.append({
            "page_id": page.page_id,
            "page_name": page.page_name,
        })
    json_data ={
        "data": page_data,
        "status": True,
        "statusMessage": "Pages retrieved successfully"
    }
    return json_data, 200