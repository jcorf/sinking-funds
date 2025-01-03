from utils.database_utils import *
from utils.utils import nowString, listToDict


def setup_database():
    execute_query('''
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
    print("SET UP database")
    return True


def delete_db():
    try:
        query = 'DROP TABLE IF EXISTS savings'
        execute_query(query)
        print("DROPPED database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def add_savings_category(category, saved, goal, goal_date, calculated_to_save):
    try:
        query = f"""INSERT INTO savings (category, saved, goal, goal_date, calculated_to_save, last_updated)
                               VALUES (?, ?, ?, ?, ?, ?)"""
        execute_query(query, category, saved, goal, goal_date, calculated_to_save, nowString())
        print(f"ADDED {category} to database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def add_db(category, saved, goal, goal_date, to_save):
    return add_savings_category(category, saved, goal, goal_date, to_save)


def get_all_data():
    query = f"SELECT id, category, saved, goal, goal_date, calculated_to_save FROM savings"
    rows = select_query(query)
    cols = ["id", "category", "saved", "goal", "goal_date", "calculated_to_save"]
    return [listToDict(row, cols) for row in rows]


def delete_row_based_on_category(value, field="category"):
    print(value, field)
    try:
        if (validate_primary_key(value)):
            execute_query(f"DELETE FROM savings WHERE {field} = '{value}'")
            print(f"DELETED {field} = '{value}'")
            return True
        else:
            print("NO ROW FOUND")
            return False
    except Exception as e:
        print("Exception", e)
        return False


def get_categories():
    rows = select_query("SELECT DISTINCT category FROM savings")
    return [row[0] for row in rows]


def get_ids():
    rows = select_query("SELECT DISTINCT id FROM savings")
    return [row[0] for row in rows]


def update_field(field_to_change, new_value, filter_value, field_filter="category"):
    try:
        if (validate_primary_key(filter_value)):
            query = f"UPDATE savings SET {field_to_change} = '{new_value}', last_updated = {nowString()} WHERE {field_filter} = '{filter_value}'"
            print(query)
            execute_query(query)
            print(f"UPDATED {field_filter}={filter_value} {field_to_change} to {new_value}")
        else:
            print(f"NO instances of {field_filter}={filter_value}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


# Get the category information, based on the category name or the id value (must be specified)
def get_category_info(value, field="category"):
    query = f"SELECT id, category, saved, goal, goal_date, calculated_to_save FROM savings WHERE {field} = '{value}' LIMIT 1"
    row = select_query(query)
    return listToDict(row[0], ["id", "category", "saved", "goal", "goal_date", "calculated_to_save"])


# validate ID or category
def validate_primary_key(key):
    value = str(key)
    if value.isdigit():
        ids = get_ids()
        return int(value) in ids
    else:
        categories = get_categories()
        print(categories)
        print(key)
        return value in categories


# TESTS
if False:
    print("----------------")
    delete_db()
    setup_database()

    # Generate random categories
    categories = [
        "emergency fund", "vacation", "pets", "car", "kids"
    ]

    for category in categories:
        saved = random.randint(100, 1000)  # Random saved amount
        goal = saved + random.randint(500, 2000)  # Goal is greater than saved
        calculated_to_save = goal - saved  # Amount left to save
        add_db(category, saved, goal, "2025-01-01", calculated_to_save)

    print("-----------")

    print(get_categories())

    get_category_info("emergency fund")
    get_category_info(2, "id")
    get_category_info('3', "id")

    delete_row_based_on_category(2, 'id')
    delete_row_based_on_category("pets")

    print(get_categories())

    update_field("goal_date", "2026-01-01", "car")
    update_field("goal_date", "2027-01-01", 5, "id")
    update_field("goal_date", "2027-01-01", 3, "id")

    get_category_info("car")
    get_category_info("kids")

    ## True, False, True
    print(validate_primary_key(5))
    print(validate_primary_key(3))
    print(validate_primary_key("emergency fund"))

    delete_db()
