import sqlite3
import os
from utils.reference.database_constants import DATABASE_NAME

def execute_query(sqlQuery, *parameters):
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    cursor.execute(sqlQuery, parameters)
    conn.commit()
    conn.close()

def select_query(sqlQuery):
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        cursor.execute(sqlQuery)
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        print(f"Error selecting: {e}")
        return []
    
def delete_database(db_name=DATABASE_NAME):
    try:
        os.remove(db_name)
        print(f"Database '{db_name}' deleted successfully.")
    except FileNotFoundError:
        print(f"Database '{db_name}' not found.")
    except Exception as e:
        print(f"An error occurred while trying to delete the database: {e}")
