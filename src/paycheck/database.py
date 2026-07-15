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


VALID_SAVINGS_FIELDS = {"category", "saved", "goal", "goal_date", "calculated_to_save", "emoji", "display_order"}


def update_field(field_to_change, new_value, filter_value, field_filter="category"):
    try:
        if field_to_change not in VALID_SAVINGS_FIELDS or field_filter not in VALID_SAVINGS_FIELDS:
            print(f"Rejected update: invalid field name {field_to_change!r}/{field_filter!r}")
            return False
        if (validate_primary_key(filter_value)):
            # field_to_change/field_filter are column names (validated against
            # VALID_SAVINGS_FIELDS above) and can't be parameterized like values,
            # but new_value/nowString()/filter_value are actual values and are.
            query = f"UPDATE savings SET {field_to_change} = ?, last_updated = ? WHERE {field_filter} = ?"
            execute_query(query, new_value, nowString(), filter_value)
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
    cards = [listToDict(row, cols) for row in rows]

    print("DEBUG: get_all_credit_cards returning:")
    for card in cards:
        print(f"  {card['card_name']}: posted={card['posted_transactions']}, pending={card['pending_transactions']}, covered={card['covered_transactions']}")

    return cards


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

        # Get current card data BEFORE update
        current_card = get_credit_card_info(card_name)
        if not current_card:
            print(f"Card {card_name} not found")
            return False

        print(f"DEBUG: Before update - {card_name}: posted={current_card['posted_transactions']}, pending={current_card['pending_transactions']}, covered={current_card['covered_transactions']}")

        # Update both fields
        query = "UPDATE credit_cards SET covered_sub_balances = ?, covered_transactions = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, json.dumps(sub_balances), total_covered, nowString(), card_name)

        # Recalculate total balance using the preserved current data
        total_balance = current_card['posted_transactions'] + current_card['pending_transactions'] - total_covered
        query = "UPDATE credit_cards SET total_balance = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, total_balance, nowString(), card_name)

        print(f"DEBUG: After update - {card_name}: total_balance={total_balance}")
        print(f"UPDATED {card_name} covered sub-balances")
        return True
    except Exception as e:
        print("Exception updating covered sub-balances:", e)
        return False


def update_pending_sub_balances(card_name, sub_balances):
    """Update pending sub-balances and recalculate pending_transactions total"""
    try:
        # Calculate total pending amount from sub-balances
        total_pending = sum(float(balance['amount']) for balance in sub_balances)

        # Get current card data BEFORE update
        current_card = get_credit_card_info(card_name)
        if not current_card:
            print(f"Card {card_name} not found")
            return False

        print(f"DEBUG: Before update - {card_name}: posted={current_card['posted_transactions']}, pending={current_card['pending_transactions']}, covered={current_card['covered_transactions']}")

        # Update both fields
        query = "UPDATE credit_cards SET pending_sub_balances = ?, pending_transactions = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, json.dumps(sub_balances), total_pending, nowString(), card_name)

        # Recalculate total balance using the preserved current data
        total_balance = current_card['posted_transactions'] + total_pending - current_card['covered_transactions']
        query = "UPDATE credit_cards SET total_balance = ?, last_updated = ? WHERE card_name = ?"
        execute_query(query, total_balance, nowString(), card_name)

        print(f"DEBUG: After update - {card_name}: total_balance={total_balance}")
        print(f"UPDATED {card_name} pending sub-balances")
        return True
    except Exception as e:
        print("Exception updating pending sub-balances:", e)
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


# BUDGET CATEGORY FUNCTIONS
#
# All budget categories are assumed to recur on the semi-monthly paycheck
# schedule. The table still has a legacy `frequency` column (unused, kept
# only because dropping it would mean altering an existing user's table),
# but the app no longer reads or writes it.

VALID_BUDGET_CATEGORY_FIELDS = {"category", "amount"}


def setup_budget_categories_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS budget_categories (
        id INTEGER PRIMARY KEY,
        category TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        frequency TEXT NOT NULL DEFAULT 'paycheck',
        display_order INTEGER DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    print("SET UP budget categories database")
    return True


def add_budget_category(category, amount=0):
    try:
        max_order_query = "SELECT COALESCE(MAX(display_order), -1) FROM budget_categories"
        max_order_result = select_query(max_order_query)
        next_order = max_order_result[0][0] + 1 if max_order_result else 0

        query = """INSERT INTO budget_categories (category, amount, frequency, display_order, last_updated)
                                              VALUES (?, ?, 'paycheck', ?, ?)"""
        execute_query(query, category, amount, next_order, nowString())
        print(f"ADDED {category} to budget categories database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def get_all_budget_categories():
    if not table_exists('budget_categories'):
        print("Budget categories table doesn't exist, creating it...")
        setup_budget_categories_database()
        print("✅ Budget categories table created")

    query = "SELECT id, category, amount, display_order FROM budget_categories ORDER BY display_order"
    rows = select_query(query)
    cols = ["id", "category", "amount", "display_order"]
    return [listToDict(row, cols) for row in rows]


def update_budget_category_field(field_to_change, new_value, category):
    try:
        if field_to_change not in VALID_BUDGET_CATEGORY_FIELDS:
            print(f"Rejected update: invalid field name {field_to_change!r}")
            return False

        query = f"UPDATE budget_categories SET {field_to_change} = ?, last_updated = ? WHERE category = ?"
        execute_query(query, new_value, nowString(), category)
        print(f"UPDATED budget category {category} {field_to_change} to {new_value}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def delete_budget_category(category):
    try:
        query = "DELETE FROM budget_categories WHERE category = ?"
        execute_query(query, category)
        print(f"DELETED budget category {category}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def update_budget_category_order(card_orders):
    """Update the display order for multiple budget categories"""
    try:
        for order, card_id in enumerate(card_orders):
            query = "UPDATE budget_categories SET display_order = ? WHERE id = ?"
            execute_query(query, order, card_id)
        print(f"UPDATED budget category order for {len(card_orders)} categories")
        return True
    except Exception as e:
        print("Exception", e)
        return False


# PAYCHECK SETTINGS FUNCTIONS (single-row settings, same shape as ally_bank)

VALID_PAYCHECK_SETTINGS_FIELDS = {"net_pay", "pre_tax_retirement", "taxes"}


def setup_paycheck_settings_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS paycheck_settings (
        id INTEGER PRIMARY KEY,
        net_pay REAL NOT NULL DEFAULT 0,
        pre_tax_retirement REAL NOT NULL DEFAULT 0,
        taxes REAL NOT NULL DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    result = select_query("SELECT COUNT(*) FROM paycheck_settings")
    if result[0][0] == 0:
        execute_query('''
        INSERT INTO paycheck_settings (net_pay, pre_tax_retirement, taxes, last_updated)
        VALUES (?, ?, ?, ?)
        ''', 0, 0, 0, nowString())
    print("SET UP paycheck settings database")
    return True


def ensure_paycheck_settings_columns():
    """Add the taxes column to an existing paycheck_settings table if it predates it"""
    try:
        from utils.reference.database_constants import DATABASE_NAME
        import sqlite3

        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(paycheck_settings)")
        column_names = [col[1] for col in cursor.fetchall()]
        conn.close()

        if 'taxes' not in column_names:
            execute_query("ALTER TABLE paycheck_settings ADD COLUMN taxes REAL NOT NULL DEFAULT 0")
            print("✅ Added taxes column to paycheck_settings")
    except Exception as e:
        print(f"Error checking columns: {e}")


def get_paycheck_settings():
    if not table_exists('paycheck_settings'):
        print("Paycheck settings table doesn't exist, creating it...")
        setup_paycheck_settings_database()
        print("✅ Paycheck settings table created")
    else:
        ensure_paycheck_settings_columns()

    query = "SELECT net_pay, pre_tax_retirement, taxes FROM paycheck_settings LIMIT 1"
    row = select_query(query)
    cols = ["net_pay", "pre_tax_retirement", "taxes"]
    return listToDict(row[0], cols) if row else {"net_pay": 0, "pre_tax_retirement": 0, "taxes": 0}


def update_paycheck_settings_field(field_to_change, new_value):
    try:
        if field_to_change not in VALID_PAYCHECK_SETTINGS_FIELDS:
            print(f"Rejected update: invalid field name {field_to_change!r}")
            return False

        query = f"UPDATE paycheck_settings SET {field_to_change} = ?, last_updated = ? WHERE id = 1"
        execute_query(query, new_value, nowString())
        print(f"UPDATED paycheck settings {field_to_change} to {new_value}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


# POST-TAX CONTRIBUTION FUNCTIONS (same shape as budget_categories)

VALID_POST_TAX_CONTRIBUTION_FIELDS = {"category", "amount"}


def setup_post_tax_contributions_database():
    execute_query('''
    CREATE TABLE IF NOT EXISTS post_tax_contributions (
        id INTEGER PRIMARY KEY,
        category TEXT UNIQUE NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        last_updated DATE NOT NULL
    )
    ''')
    print("SET UP post-tax contributions database")
    return True


def add_post_tax_contribution(category, amount=0):
    try:
        max_order_query = "SELECT COALESCE(MAX(display_order), -1) FROM post_tax_contributions"
        max_order_result = select_query(max_order_query)
        next_order = max_order_result[0][0] + 1 if max_order_result else 0

        query = """INSERT INTO post_tax_contributions (category, amount, display_order, last_updated)
                                                   VALUES (?, ?, ?, ?)"""
        execute_query(query, category, amount, next_order, nowString())
        print(f"ADDED {category} to post-tax contributions database")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def get_all_post_tax_contributions():
    if not table_exists('post_tax_contributions'):
        print("Post-tax contributions table doesn't exist, creating it...")
        setup_post_tax_contributions_database()
        print("✅ Post-tax contributions table created")

    query = "SELECT id, category, amount, display_order FROM post_tax_contributions ORDER BY display_order"
    rows = select_query(query)
    cols = ["id", "category", "amount", "display_order"]
    return [listToDict(row, cols) for row in rows]


def update_post_tax_contribution_field(field_to_change, new_value, category):
    try:
        if field_to_change not in VALID_POST_TAX_CONTRIBUTION_FIELDS:
            print(f"Rejected update: invalid field name {field_to_change!r}")
            return False

        query = f"UPDATE post_tax_contributions SET {field_to_change} = ?, last_updated = ? WHERE category = ?"
        execute_query(query, new_value, nowString(), category)
        print(f"UPDATED post-tax contribution {category} {field_to_change} to {new_value}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def delete_post_tax_contribution(category):
    try:
        query = "DELETE FROM post_tax_contributions WHERE category = ?"
        execute_query(query, category)
        print(f"DELETED post-tax contribution {category}")
        return True
    except Exception as e:
        print("Exception", e)
        return False


def update_post_tax_contribution_order(card_orders):
    """Update the display order for multiple post-tax contributions"""
    try:
        for order, card_id in enumerate(card_orders):
            query = "UPDATE post_tax_contributions SET display_order = ? WHERE id = ?"
            execute_query(query, order, card_id)
        print(f"UPDATED post-tax contribution order for {len(card_orders)} categories")
        return True
    except Exception as e:
        print("Exception", e)
        return False


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

