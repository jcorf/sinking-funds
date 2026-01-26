from utils.database_utils import *
from utils.utils import nowString, listToDict
import random
import json


def setup_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS savings (
        id INTEGER PRIMARY KEY,
        category TEXT UNIQUE NOT NULL,
        saved REAL NOT NULL,
        goal REAL NOT NULL,
        goal_date DATE NOT NULL,
        calculated_to_save REAL NOT NULL,
        emoji TEXT DEFAULT ':heart:',
        display_order INTEGER DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    print("SET UP database")
    return True


def setup_credit_cards_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS credit_cards (
        id INTEGER PRIMARY KEY,
        card_name TEXT UNIQUE NOT NULL,
        posted_transactions REAL DEFAULT 0.0,
        pending_transactions REAL DEFAULT 0,
        covered_transactions REAL DEFAULT 0,
        covered_sub_balances TEXT DEFAULT '[]',
        pending_sub_balances TEXT DEFAULT '[]',
        total_balance REAL DEFAULT 0,
        payment_tags TEXT DEFAULT '',
        display_order INTEGER DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    print("SET UP credit cards database")
    return True


def add_display_order_to_credit_cards():
    """Add display_order column to existing credit_cards table if it doesn't exist"""
    try:
        # Check if column exists by trying to select it
        select_query("SELECT display_order FROM credit_cards LIMIT 1")
        print("display_order column already exists")
    except:
        # Column doesn't exist, add it
        execute_query("ALTER TABLE credit_cards ADD COLUMN display_order INTEGER DEFAULT 0")
        # Set initial order based on existing id
        rows = select_query("SELECT id FROM credit_cards ORDER BY id")
        for order, row in enumerate(rows):
            execute_query(f"UPDATE credit_cards SET display_order = {order} WHERE id = {row[0]}")
        print("ADDED display_order column to credit_cards")
    return True


def setup_ally_bank_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS ally_bank (
        id INTEGER PRIMARY KEY,
        account_name TEXT DEFAULT 'Ally Bank',
        balance REAL DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    # Insert default Ally Bank account if it doesn't exist
    result = select_query("SELECT COUNT(*) FROM ally_bank")
    if result[0][0] == 0:
        execute_query('''
        INSERT INTO ally_bank (account_name, balance, last_updated)
        VALUES (?, ?, ?)
        ''', 'Ally Bank', 0, nowString())
    print("SET UP Ally Bank database")
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


def add_savings_category(category, saved, goal, goal_date, calculated_to_save, emoji=':heart:'):
    try:
        # Get the next order number
        max_order_query = "SELECT COALESCE(MAX(display_order), -1) FROM savings"
        max_order_result = select_query(max_order_query)
        next_order = max_order_result[0][0] + 1 if max_order_result else 0
        
        query = f"""INSERT INTO savings (category, saved, goal, goal_date, calculated_to_save, emoji, display_order, last_updated)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        execute_query(query, category, saved, goal, goal_date, calculated_to_save, emoji, next_order, nowString())
        print(f"ADDED {category} to database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def add_db(category, saved, goal, goal_date, to_save, emoji=':heart:'):
    return add_savings_category(category, saved, goal, goal_date, to_save, emoji)


def get_all_data():
    # Ensure savings table exists
    if not table_exists('savings'):
        print("Savings table doesn't exist, creating it...")
        setup_database()
        print("✅ Savings table created")

    query = f"SELECT id, category, saved, goal, goal_date, calculated_to_save, emoji, display_order FROM savings ORDER BY display_order"
    rows = select_query(query)
    cols = ["id", "category", "saved", "goal", "goal_date", "calculated_to_save", "emoji", "display_order"]
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
    query = f"SELECT id, category, saved, goal, goal_date, calculated_to_save, emoji, display_order FROM savings WHERE {field} = '{value}' LIMIT 1"
    row = select_query(query)
    return listToDict(row[0], ["id", "category", "saved", "goal", "goal_date", "calculated_to_save", "emoji", "display_order"])


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


def update_card_order(card_orders):
    """Update the display order for multiple cards"""
    try:
        for order, card_id in enumerate(card_orders):
            query = f"UPDATE savings SET display_order = {order} WHERE id = {card_id}"
            execute_query(query)
        print(f"UPDATED card order for {len(card_orders)} cards")
        return True
    except Exception as e:
        print("Exception", e)
        return False


# CREDIT CARD FUNCTIONS

def add_credit_card(card_name, posted=0, pending=0, covered=0, payment_tags=''):
    try:
        # Get the next order number
        max_order_query = "SELECT COALESCE(MAX(display_order), -1) FROM credit_cards"
        max_order_result = select_query(max_order_query)
        next_order = max_order_result[0][0] + 1 if max_order_result else 0
        
        total_balance = posted + pending - covered
        query = f"""INSERT INTO credit_cards (card_name, posted_transactions, pending_transactions, covered_transactions,
                                               total_balance, payment_tags, display_order, last_updated)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"""
        execute_query(query, card_name, posted, pending, covered, total_balance, payment_tags, next_order, nowString())
        print(f"ADDED {card_name} to credit cards database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def table_exists(table_name):
    """Check if a table exists in the database"""
    try:
        query = f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"
        result = select_query(query)
        return len(result) > 0
    except:
        return False


def ensure_credit_cards_columns():
    """Ensure all required columns exist in credit_cards table"""
    try:
        # Import here to avoid circular import
        from utils.reference.database_constants import DATABASE_NAME
        import sqlite3

        # Check if pending_sub_balances column exists by querying the table info
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(credit_cards)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        conn.close()

        if 'pending_sub_balances' not in column_names:
            # Column doesn't exist, add it
            execute_query("ALTER TABLE credit_cards ADD COLUMN pending_sub_balances TEXT DEFAULT '[]'")
            print("✅ Added pending_sub_balances column to existing table")
    except Exception as e:
        print(f"Error checking columns: {e}")


def get_all_credit_cards():
    # Ensure credit_cards table exists
    if not table_exists('credit_cards'):
        print("Credit cards table doesn't exist, creating it...")
        setup_credit_cards_database()
        add_display_order_to_credit_cards()
        setup_default_credit_cards()
        print("✅ Credit cards table created with default cards")
    else:
        # Table exists, ensure it has all required columns
        ensure_credit_cards_columns()

    query = f"SELECT id, card_name, posted_transactions, pending_transactions, covered_transactions, covered_sub_balances, pending_sub_balances, total_balance, payment_tags, display_order FROM credit_cards ORDER BY display_order"
    rows = select_query(query)
    cols = ["id", "card_name", "posted_transactions", "pending_transactions", "covered_transactions", "covered_sub_balances", "pending_sub_balances", "total_balance", "payment_tags", "display_order"]
    return [listToDict(row, cols) for row in rows]


def update_credit_card_order(card_orders):
    """Update the display order for multiple credit cards"""
    try:
        for order, card_id in enumerate(card_orders):
            query = f"UPDATE credit_cards SET display_order = {order} WHERE id = {card_id}"
            execute_query(query)
        print(f"UPDATED credit card order for {len(card_orders)} cards")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def get_credit_card_info(card_name):
    query = f"SELECT id, card_name, posted_transactions, pending_transactions, covered_transactions, covered_sub_balances, pending_sub_balances, total_balance, payment_tags FROM credit_cards WHERE card_name = '{card_name}' LIMIT 1"
    row = select_query(query)
    if row:
        return listToDict(row[0], ["id", "card_name", "posted_transactions", "pending_transactions", "covered_transactions", "covered_sub_balances", "pending_sub_balances", "total_balance", "payment_tags"])
    return None


# ALLY BANK FUNCTIONS

def get_ally_bank_balance():
    # Ensure ally_bank table exists
    if not table_exists('ally_bank'):
        print("Ally bank table doesn't exist, creating it...")
        setup_ally_bank_database()
        print("✅ Ally bank table created")

    query = "SELECT balance FROM ally_bank LIMIT 1"
    row = select_query(query)
    return row[0][0] if row else 0


def update_ally_bank_balance(new_balance):
    try:
        query = "UPDATE ally_bank SET balance = ?, last_updated = ? WHERE id = 1"
        execute_query(query, new_balance, nowString())
        print(f"UPDATED Ally Bank balance to {new_balance}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def update_credit_card_balance(card_name, field, new_value):
    try:
        # Update the specific field
        query = f"UPDATE credit_cards SET {field} = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, new_value, nowString(), card_name)

        # Recalculate total_balance if any balance-related field was updated
        if field in ['posted_transactions', 'pending_transactions', 'covered_transactions']:
            card = get_credit_card_info(card_name)
            if card:
                total_balance = card['posted_transactions'] + card['pending_transactions'] - card['covered_transactions']
                query = "UPDATE credit_cards SET total_balance = ?, last_updated = ? WHERE card_name = ?"
                execute_query(query, total_balance, nowString(), card_name)

        print(f"UPDATED {card_name} {field} to {new_value}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def update_covered_sub_balances(card_name, sub_balances):
    """Update covered sub-balances and recalculate covered_transactions total"""
    try:
        # Calculate total covered amount from sub-balances
        total_covered = sum(float(balance['amount']) for balance in sub_balances)

        # Update both fields
        query = "UPDATE credit_cards SET covered_sub_balances = ?, covered_transactions = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, json.dumps(sub_balances), total_covered, nowString(), card_name)

        # Recalculate total balance
        card = get_credit_card_info(card_name)
        if card:
            total_balance = card['posted_transactions'] + card['pending_transactions'] - total_covered
            query = "UPDATE credit_cards SET total_balance = ?, last_updated = ? WHERE card_name = ?"
            execute_query(query, total_balance, nowString(), card_name)

        print(f"UPDATED {card_name} covered sub-balances")
        return True
    except Exception as e:
        print("Exception updating covered sub-balances:", e)
        return False


def delete_credit_card(card_name):
    try:
        query = "DELETE FROM credit_cards WHERE card_name = ?"
        execute_query(query, card_name)
        print(f"DELETED credit card {card_name}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def get_credit_card_names():
    rows = select_query("SELECT DISTINCT card_name FROM credit_cards")
    return [row[0] for row in rows]


def setup_default_credit_cards():
    """Setup default credit cards if they don't exist"""
    default_cards = ['Amex', 'Discover', 'Apple']
    for card in default_cards:
        if card not in get_credit_card_names():
            add_credit_card(card)
    print("SET UP default credit cards")
    return True


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

    print(get_all_data())

    #delete_db()

