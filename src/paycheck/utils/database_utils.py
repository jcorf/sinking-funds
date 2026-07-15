import sqlite3
import os
from utils.reference.database_constants import DATABASE_NAME

def execute_query(sqlQuery, *parameters):
    # conn.close() must run even if execute() raises (e.g. a UNIQUE constraint
    # violation) -- otherwise the connection leaks, and enough leaked
    # connections eventually make SQLite report "database is locked" on
    # completely unrelated queries.
    conn = sqlite3.connect(DATABASE_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute(sqlQuery, parameters)
        conn.commit()
    finally:
        conn.close()

def select_query(sqlQuery):
    conn = sqlite3.connect(DATABASE_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute(sqlQuery)
        return cursor.fetchall()
    except Exception as e:
        print(f"Error selecting: {e}")
        return []
    finally:
        conn.close()
    
def delete_database(db_name=DATABASE_NAME):
    try:
        os.remove(db_name)
        print(f"Database '{db_name}' deleted successfully.")
    except FileNotFoundError:
        print(f"Database '{db_name}' not found.")
    except Exception as e:
        print(f"An error occurred while trying to delete the database: {e}")
