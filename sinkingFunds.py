from calculateFunctions import previous_weekday, remaining_paychecks, save_per_paycheck, remaining

import sqlite3
import os
import csv
from datetime import datetime, timedelta

## DATABASE ##

def setup_database():
    # Connect to the database (or create it if it doesn't exist)
    conn = sqlite3.connect('sinkingFunds.db')
    cursor = conn.cursor()

    # Create a table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY,
        category TEXT UNIQUE NOT NULL,
        saved REAL NOT NULL,
        goal REAL NOT NULL,
        goal_date DATE NOT NULL,
        calculated_to_save REAL NOT NULL,
        last_updated DATE NOT NULL
    )
    ''')


    # Insert data into the table
    #cursor.execute('''
    #INSERT INTO savings (category, saved, goal, goal_date, calculated_to_save, last_updated)
    #VALUES 
    #    ('Emergency Fund', 500.00, 1000.00, '2024-12-31', 500.00, ?)
    #''', (datetime.now().strftime("%Y-%m-%d")))
    #'''

    # Commit the changes and close the connection
    conn.commit()
    conn.close()


def query_database():
    conn = sqlite3.connect('sinkingFunds.db')
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM savings')
    rows = cursor.fetchall()

    for row in rows:
        print(row)

    conn.close()


def delete_database(db_name):
    try:
        os.remove(db_name)
        print(f"Database '{db_name}' deleted successfully.")
    except FileNotFoundError:
        print(f"Database '{db_name}' not found.")
    except Exception as e:
        print(f"An error occurred while trying to delete the database: {e}")

        
## ADD CATEGORY
def add_savings_category(category, saved, goal, goal_date, calculated_to_save):
    try:
        # Connect to the database
        conn = sqlite3.connect('sinkingFunds.db')
        cursor = conn.cursor()

        # Insert data into the table
        cursor.execute('''
        INSERT INTO savings (category, saved, goal, goal_date, calculated_to_save, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (category, saved, goal, goal_date, calculated_to_save, datetime.now().strftime("%Y-%m-%d")))

        # Commit the changes and close the connection
        conn.commit()
        conn.close()
        print(f"Category '{category}' added successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        
def add_db(category, saved, goal, goal_date, start_date=datetime.now()): 
    to_save = save_per_paycheck(saved,goal,start_date, datetime.strptime(goal_date, "%Y-%m-%d"))
    add_savings_category(category, saved, goal, goal_date, to_save)
        

## UPDATE SAVINGS AMOUNT

def update_savings(category, amount, toAdd=True):
    try:
        conn = sqlite3.connect('sinkingFunds.db')
        cursor = conn.cursor()

        cursor.execute('SELECT saved FROM savings WHERE category = ?', (category,))
        current_saved = cursor.fetchone()[0]
        
        if toAdd:
            new_saved = current_saved + amount
        else:
            new_saved = amount
            
        cursor.execute('UPDATE savings SET saved = ?, last_updated = ? WHERE category = ?',
                       (new_saved, datetime.now().strftime("%Y-%m-%d"), category))
        


        conn.commit()
        conn.close()
        
        update_toSave(category)
    except Exception as e:
        print(f"An error occurred: {e}")
        
## RECALCULATE TO SAVE

def update_toSave(category):
    try:
        # Connect to the database
        conn = sqlite3.connect('sinkingFunds.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT saved, goal, goal_date, last_updated FROM savings WHERE category = ?',
                       (category,))
        row = cursor.fetchone()
        if row:
            saved, goal, goal_date, last_updated = row
            start_date = datetime.now()
        else:
            print(f"No data found for category '{category}'.")
            return False

        # Calculate amount to save per paycheck
        to_save_per_paycheck = save_per_paycheck(saved,goal,
                                                 start_date,
                                                 datetime.strptime(goal_date, "%Y-%m-%d"),False) 

        # Update 'calculated_to_save' amount in the database for the category
        query = 'UPDATE savings SET calculated_to_save = ?, last_updated = ? WHERE category = ?'
        params = (to_save_per_paycheck, datetime.now().strftime("%Y-%m-%d"), category)
        cursor.execute(query, params)
        

        # Commit the changes and close the connection
        conn.commit()
        conn.close()

        print(f"Updated 'calculated_to_save' (${to_save_per_paycheck}) amount successfully for category '{category}'.")
    except Exception as e:
        print(f"An error occurred: {e}")
        
        
## UPDATE FIELD

def update_field(category, field, new_value):
    try:
        # Connect to the database
        conn = sqlite3.connect('sinkingFunds.db')
        cursor = conn.cursor()

        # Determine which field to update and construct the query
        if field == 'goal_date':
            query = 'UPDATE savings SET goal_date = ?, last_updated = ? WHERE category = ?'
            params = (new_value, datetime.now().strftime("%Y-%m-%d"), category)
        elif field == 'category':
            query = 'UPDATE savings SET category = ?, last_updated = ? WHERE category = ?'
            params = (new_value, datetime.now().strftime("%Y-%m-%d"), category)
        elif field == 'goal':
            query = 'UPDATE savings SET goal = ?, last_updated = ? WHERE category = ?'
            params = (new_value, datetime.now().strftime("%Y-%m-%d"), category)
        else:
            print(f"Invalid field '{field}'. Field must be one of 'goal_date', 'category', or 'goal'.")
            return False

        # Execute the query and commit changes
        cursor.execute(query, params)
        conn.commit()

        # Close the connection
        conn.close()
        
        ## updateFeild info
        update_toSave(category)

        print(f"Updated '{field}' successfully for category '{category}'.")
        return True
    except Exception as e:
        print(f"An error occurred: {e}")
        return False
    
## DELETE ROW
def delete_row_based_on_category(category_name):
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("sinkingFunds.db")
        cursor = conn.cursor()

        # Execute the DELETE query
        cursor.execute(f"DELETE FROM savings WHERE category = ?", (category_name,))

        # Commit the transaction
        conn.commit()

        conn.close()
        print(f"Deleted rows for category '{category_name}' from table savings successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        
## recalculate
def recalculate():
    categories = get_categories()
    for cat in categories:
        update_toSave(cat)
        
## CUSTOM SQL QUERY

def execute_custom_sql(sql_query):
    
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("sinkingFunds.db")
        cursor = conn.cursor()

        # Execute the custom SQL query
        cursor.execute(sql_query)

        # Fetch all rows if SELECT query, otherwise commit changes
        if sql_query.strip().upper().startswith('SELECT'):
            rows = cursor.fetchall()
            return rows
        else:
            conn.commit()
            print("SQL query executed successfully.")
            return None
    except Exception as e:
        print(f"Error executing SQL query: {e}")
        return None
    finally:
        if conn:
            conn.close()
            
def custom_sql(sql_query):
    result = execute_custom_sql(sql_query)
    if result:
        for row in result:
            print(row)


## SINGLE REPORT
def report(category):
    try:
        # Connect to the database
        conn = sqlite3.connect('sinkingFunds.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT saved, goal, goal_date, last_updated FROM savings WHERE category = ?',
                       (category,))
        row = cursor.fetchone()
        if row:
            saved, goal, goal_date, last_updated = row
            start_date = datetime.now()
        else:
            print(f"No data found for category '{category}'.")
            return False

        # Calculate amount to save per paycheck
        to_save_per_paycheck = save_per_paycheck(saved,goal,
                                                 start_date,
                                                 datetime.strptime(goal_date, "%Y-%m-%d"),True) 
        print("+$",to_save_per_paycheck, " per paycheck",sep="")
    
        # Commit the changes and close the connection
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")
        
## EXCEL 


def export_table_to_csv(csv_file):
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("sinkingFunds.db")
        cursor = conn.cursor()

        # Fetch all rows from the table
        cursor.execute(f'SELECT * FROM savings')
        rows = cursor.fetchall()

        # Get column names from the cursor description
        columns = [description[0] for description in cursor.description]

        # Write to CSV file
        with open(csv_file, 'w', newline='') as file:
            writer = csv.writer(file)
            # Write header
            writer.writerow(columns)
            # Write rows
            writer.writerows(rows)

        print(f"Table savings from sinkingFunds.db exported to '{csv_file}' successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()


## REPORT - to txt

def print_string_to_file(output_file):
    try:
        # Open the file in write mode
        with open(output_file, 'w') as file:
            # Redirect stdout to the file
            import sys
            original_stdout = sys.stdout
            sys.stdout = file
            categories = get_categories()
            # Call the function that prints the string
            print("------------------------")
            for category in categories:
                print("CATEGORY:",category)
                report(category)  # Replace with your function that prints a string
                print("------------------------")
            
            
            # Restore stdout
            sys.stdout = original_stdout
            
        print(f"Result printed to {output_file} successfully.")
    except Exception as e:
        print(f"Error printing result to file: {e}")
        
## GET CATEGORIES

def get_categories():
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect("sinkingFunds.db")
        cursor = conn.cursor()

        # Execute the SELECT query to fetch categories
        cursor.execute("SELECT DISTINCT category FROM savings")
        rows = cursor.fetchall()

        # Extract category names into a list
        categories = [row[0] for row in rows]

        conn.close()
        return categories
    except Exception as e:
        print(f"Error selecting categories: {e}")
        return []
    
    
### RUN functions
inputMessage=["1. 'delete' to delete the database",
              "2. 'setup' to setup the database",
              "3. 'get' to query the rows of the database",
              "4. 'add' to add a category to the database",
              "5. 'update' to update a field or to savings",
              "6. 'categories' to get the categories",
              "7. 'row delete' to delete a category",
              "8. 'recalculate' to recalculate toSave for all categories",
              "9. 'custom' to run a custom sql query",
              "10. 'report' to get a report of a specific category",
              "11. 'export' to get an excel and per-paycheck .txt report",
              "12. 'q' or 'quit' to quit"]

updateMessage = ["1. 'to save' to update the save field",
                "2. 'savings' to add to the savings amount (+/-)",
                "3. 'goal' to set a new goal amount",
                "4. 'category name' to set a new category name",
                "5. 'goal date' to set a new goal date"]
def runUpdate():
    fieldToUpdate = input("\n".join(updateMessage) + "\nenter:")
    if fieldToUpdate == "to save":
        category = input("category name:")
        update_toSave(category)
    elif fieldToUpdate == "savings":
        category = input("category name:")
        amount = float(input("amount:"))
        toAdd = bool(input("to add? (True or False):"))
        update_savings(category,amount,toAdd)
    elif fieldToUpdate == "goal":
        category = input("category name:")
        amount = float(input("new goal:"))
        update_field(category, "goal", amount)
        
    elif fieldToUpdate == "category name":
        category = input("category name:")
        new_category_name = input("new category name:")
        update_field(category, "category", new_category_name)
    elif fieldToUpdate == "goal date":
        category = input("category name:")
        goal_date = input("new goal date (YYYY-MM-DD):")
        update_field(category, "goal_date", goal_date)
    else:
        print("not an valid option")
        
        
def run():
    cont = True
    while cont:
        print("------------")
        user = input("\n".join(inputMessage)+"\nenter:").lower()
        print("------------")
        
        if (user == "q" or user == "quit"):
            break
        elif (user == "delete"):
            delete_database("sinkingFunds.db")
        elif (user == "setup"): 
            setup_database()
        elif (user == "get"):
            query_database()
        elif (user == "add"):
            category = input("category:")
            saved = float(input("saved:"))
            goal = float(input("goal:"))
            goal_date = input("goal date (YYYY-MM-DD):")
            add_db(category,saved,goal,goal_date)
        elif (user == "update"):
            runUpdate()
        elif (user == "categories"):
            get_categories()
        elif (user == "row delete"):
            category = input("category:")
            delete_row_based_on_category(category)
        elif (user == "recalculate"):
            recalculate()
        elif (user == "custom"):
            sql_query = input("sql query:")
            custom_sql(sql_query)
        elif (user == "report"):
            category = input("category:")
            report(category)
        elif (user == "export"):
            date = datetime.now().strftime("%Y-%m-%d-%H-%M")
            export_table_to_csv(f"/reports/{date}-sinkingFunds.csv")
            print_string_to_file(f"/reports/{date}-paycheck-schedule.txt")
        else:
            print("not a valid option")
            
run()
