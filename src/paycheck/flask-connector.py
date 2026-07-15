import os
import random

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from flask_login import login_required, login_user, logout_user, current_user

app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET_KEY"]

# CORS is only needed in local dev, where the React dev server (:3000) and
# Flask (:5000) are different origins. In production Flask serves the built
# frontend itself, so requests are same-origin and CORS is not needed.
if os.environ.get("FLASK_ENV") != "production":
    CORS(app, supports_credentials=True)
    app.config['CORS_HEADERS'] = 'Content-Type'

from auth import login_manager, User, verify_credentials
login_manager.init_app(app)

from database import (update_field, setup_database, delete_database,
                      add_db, get_category_info, delete_row_based_on_category, get_all_data, get_categories, update_card_order,
                      setup_credit_cards_database, add_credit_card, get_all_credit_cards, get_credit_card_info,
                      update_credit_card_balance, delete_credit_card, setup_default_credit_cards,
                      setup_ally_bank_database, get_ally_bank_balance, update_ally_bank_balance,
                      update_covered_sub_balances, update_pending_sub_balances, update_credit_card_order, add_display_order_to_credit_cards,
                      add_budget_category, get_all_budget_categories, update_budget_category_field,
                      delete_budget_category, update_budget_category_order,
                      get_paycheck_settings, update_paycheck_settings_field,
                      add_post_tax_contribution, get_all_post_tax_contributions, update_post_tax_contribution_field,
                      delete_post_tax_contribution, update_post_tax_contribution_order
                     )
from paycheck import saved_by_paycheck, save_per_paycheck
from utils.utils import nowString

def get_on_args(data=None):
    if data is None:
        data = request.args
    on_value = data.get('on_value')
    on_field = data.get('on_field', 'category')
    return on_value, on_field


def get_args(keys, data=None):
    if data is None:
        data = request.args
    return [data.get(key) for key in keys]


def get_start_date_args(data=None):
    if data is None:
        data = request.args
    return data.get('start_date', nowString())
    #return data.get('start_date', "2025-01-01")


#def validateCategoriesOrIds()


@app.route('/', methods=['GET'])
def root():
    return jsonify("Hi")


# AUTH ROUTES

@app.route('/login', methods=['POST'])
@cross_origin(supports_credentials=True)
def login_route():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if verify_credentials(username, password):
        login_user(User("1"))
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "invalid credentials"}), 401


@app.route('/logout', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def logout_route():
    logout_user()
    return jsonify({"success": True})


@app.route('/session', methods=['GET'])
@cross_origin(supports_credentials=True)
def session_route():
    return jsonify({"authenticated": current_user.is_authenticated})


@app.route('/saved_by_paycheck', methods=['GET'])
@login_required
def saved_by_paycheck_route():
    try:
        on_value, on_field = get_on_args()
        result = get_category_info(on_value, on_field)
        saved, goal, end_date = result['saved'], result['goal'], result['goal_date']
        start_date = get_start_date_args()
        paycheck_schedule = saved_by_paycheck(float(saved), float(goal), start_date, end_date, 'bimonthly')
        return jsonify(paycheck_schedule), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/update_field', methods=["POST"])
@cross_origin(supports_credentials=True)
@login_required
def update_field_route():
    field_to_change, new_value = get_args(['field_to_change', 'new_value'], request.get_json())
    if field_to_change == 'to_save':
        return jsonify("Use /update_to_save")
    on_value, on_field = get_on_args(request.get_json())
    result = update_field(field_to_change, new_value, on_value, on_field)

    # update to save amount
    start_date = get_start_date_args()
    update_to_save_single(on_value, on_field, start_date)
    return jsonify(result)


def update_to_save_single(on_value, on_field, start_date):
    result = get_category_info(on_value, on_field)
    saved, goal, end_date = result['saved'], result['goal'], result['goal_date']
    to_save = save_per_paycheck(float(saved), float(goal), start_date, end_date, "bimonthly")
    update_field('calculated_to_save', to_save, on_value, on_field)
    return to_save

@app.route('/update_to_save_single',methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_to_save_single_route():
    on_value, on_field = get_on_args()
    start_date = get_start_date_args()
    to_save = update_to_save_single(on_value, on_field, start_date)
    return jsonify(to_save)

@app.route('/recalculate_all', methods=['POST','PUT'])
@cross_origin(supports_credentials=True)
@login_required
def update_to_save_all_route():
    start_date = get_start_date_args(request.get_json())
    categories = get_categories()
    for category in categories:
        update_to_save_single(category, "category", start_date)
    return jsonify({"message" : "recalculated all"})

@app.route('/add_category', methods=['POST', 'PUT'])
@login_required
def add_category_route():
    category, saved, goal, goal_date = get_args(['category', 'saved', 'goal', 'goal_date'], request.get_json())
    emoji = request.get_json().get('emoji', ':heart:')  # Default to heart emoji if not provided
    start_date = get_start_date_args(request.get_json())
    to_save = save_per_paycheck(float(saved), float(goal), start_date, goal_date, "bimonthly")
    result = add_db(category, float(saved), float(goal), goal_date, to_save, emoji)
    return jsonify(result)


@app.route('/remove_category', methods=['DELETE'])
@login_required
def remove_category_route():
    on_value, on_field = get_on_args(request.get_json())
    result = delete_row_based_on_category(on_value, on_field)
    return jsonify(result)


@app.route('/get_category_info', methods=['GET'])
@login_required
def get_category_info_route():
    on_field = request.args.get('on_field', 'category')
    on_value = request.args.get('on_value')
    result = get_category_info(on_value, on_field)
    return jsonify(result)


@app.route('/get_data', methods=['GET'])
@login_required
def get_data_route():
    result = get_all_data()
    return jsonify({"data" : result})


"""
DB-RELATED ROUTES

/setup_database
    * to-do: return False if database exists
/delete_database
/add_mock_data
"""


@app.route('/setup_database', methods=["POST"])
@login_required
def setup_database_route():
    result = setup_database()
    return jsonify(result)


@app.route('/delete_database', methods=["POST"])
@login_required
def delete_database_route():
    result = delete_database()
    return jsonify(result)


@app.route('/add_mock_data', methods=['POST'])
@login_required
def add_mock_data_route():
    categories = [
        "emergency fund", "vacation", "pets", "car", "kids"
    ]

    for category in categories:
        saved = random.randint(100, 1000)  # Random saved amount
        goal = saved + random.randint(500, 2000)  # Goal is greater than saved
        calculated_to_save = goal - saved  # Amount left to save
        add_db(category, saved, goal, "2025-01-01", calculated_to_save)

    return jsonify({"Added Data": "True"})

@app.route('/update_card_order', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_card_order_route():
    card_orders = request.get_json().get('card_orders', [])
    result = update_card_order(card_orders)
    return jsonify({"success": result})


# CREDIT CARD ROUTES

@app.route('/setup_credit_cards_database', methods=["POST"])
@login_required
def setup_credit_cards_database_route():
    result = setup_credit_cards_database()
    return jsonify(result)


@app.route('/setup_default_credit_cards', methods=['POST'])
@login_required
def setup_default_credit_cards_route():
    result = setup_default_credit_cards()
    return jsonify(result)


@app.route('/get_credit_cards', methods=['GET'])
@login_required
def get_credit_cards_route():
    result = get_all_credit_cards()
    return jsonify({"data": result})


@app.route('/get_credit_card_info', methods=['GET'])
@login_required
def get_credit_card_info_route():
    card_name = request.args.get('card_name')
    result = get_credit_card_info(card_name)
    return jsonify(result)


@app.route('/add_credit_card', methods=['POST', 'PUT'])
@login_required
def add_credit_card_route():
    data = request.get_json()
    card_name = data.get('card_name')
    posted = data.get('posted_transactions', 0)
    pending = data.get('pending_transactions', 0)
    covered = data.get('covered_transactions', 0)
    payment_tags = data.get('payment_tags', '')
    result = add_credit_card(card_name, posted, pending, covered, payment_tags)
    return jsonify(result)


@app.route('/update_credit_card_balance', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_credit_card_balance_route():
    data = request.get_json()
    card_name = data.get('card_name')
    field = data.get('field')
    new_value = data.get('new_value')
    result = update_credit_card_balance(card_name, field, new_value)
    return jsonify(result)


@app.route('/remove_credit_card', methods=['DELETE'])
@login_required
def remove_credit_card_route():
    data = request.get_json()
    card_name = data.get('card_name')
    result = delete_credit_card(card_name)
    return jsonify(result)


# ALLY BANK ROUTES

@app.route('/setup_ally_bank_database', methods=["POST"])
@login_required
def setup_ally_bank_database_route():
    result = setup_ally_bank_database()
    return jsonify(result)


@app.route('/get_ally_bank_balance', methods=['GET'])
@login_required
def get_ally_bank_balance_route():
    result = get_ally_bank_balance()
    return jsonify({"balance": result})


@app.route('/update_ally_bank_balance', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_ally_bank_balance_route():
    data = request.get_json()
    new_balance = data.get('balance', 0)
    result = update_ally_bank_balance(new_balance)
    return jsonify(result)


@app.route('/update_covered_sub_balances', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_covered_sub_balances_route():
    data = request.get_json()
    card_name = data.get('card_name')
    sub_balances = data.get('sub_balances', [])
    result = update_covered_sub_balances(card_name, sub_balances)
    return jsonify(result)


@app.route('/update_pending_sub_balances', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_pending_sub_balances_route():
    data = request.get_json()
    card_name = data.get('card_name')
    sub_balances = data.get('sub_balances', [])
    result = update_pending_sub_balances(card_name, sub_balances)
    return jsonify(result)


@app.route('/update_credit_card_order', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_credit_card_order_route():
    card_orders = request.get_json().get('card_orders', [])
    result = update_credit_card_order(card_orders)
    return jsonify({"success": result})


@app.route('/add_display_order_column', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def add_display_order_column_route():
    """Migration endpoint to add display_order column to existing credit_cards table"""
    result = add_display_order_to_credit_cards()
    return jsonify({"success": result})


# BUDGET CATEGORY ROUTES

@app.route('/get_budget_categories', methods=['GET'])
@login_required
def get_budget_categories_route():
    result = get_all_budget_categories()
    return jsonify({"data": result})


@app.route('/add_budget_category', methods=['POST', 'PUT'])
@login_required
def add_budget_category_route():
    data = request.get_json()
    category = data.get('category')
    amount = data.get('amount', 0)
    result = add_budget_category(category, float(amount))
    return jsonify(result)


@app.route('/update_budget_category', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_budget_category_route():
    data = request.get_json()
    category = data.get('category')
    field_to_change = data.get('field_to_change')
    new_value = data.get('new_value')
    result = update_budget_category_field(field_to_change, new_value, category)
    return jsonify({"success": result})


@app.route('/remove_budget_category', methods=['DELETE'])
@login_required
def remove_budget_category_route():
    data = request.get_json()
    category = data.get('category')
    result = delete_budget_category(category)
    return jsonify(result)


@app.route('/update_budget_category_order', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_budget_category_order_route():
    card_orders = request.get_json().get('card_orders', [])
    result = update_budget_category_order(card_orders)
    return jsonify({"success": result})


# PAYCHECK SETTINGS ROUTES

@app.route('/get_paycheck_settings', methods=['GET'])
@login_required
def get_paycheck_settings_route():
    result = get_paycheck_settings()
    return jsonify(result)


@app.route('/update_paycheck_settings', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_paycheck_settings_route():
    data = request.get_json()
    field_to_change = data.get('field_to_change')
    new_value = data.get('new_value')
    result = update_paycheck_settings_field(field_to_change, new_value)
    return jsonify({"success": result})


# POST-TAX CONTRIBUTION ROUTES

@app.route('/get_post_tax_contributions', methods=['GET'])
@login_required
def get_post_tax_contributions_route():
    result = get_all_post_tax_contributions()
    return jsonify({"data": result})


@app.route('/add_post_tax_contribution', methods=['POST', 'PUT'])
@login_required
def add_post_tax_contribution_route():
    data = request.get_json()
    category = data.get('category')
    amount = data.get('amount', 0)
    result = add_post_tax_contribution(category, float(amount))
    return jsonify(result)


@app.route('/update_post_tax_contribution', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_post_tax_contribution_route():
    data = request.get_json()
    category = data.get('category')
    field_to_change = data.get('field_to_change')
    new_value = data.get('new_value')
    result = update_post_tax_contribution_field(field_to_change, new_value, category)
    return jsonify({"success": result})


@app.route('/remove_post_tax_contribution', methods=['DELETE'])
@login_required
def remove_post_tax_contribution_route():
    data = request.get_json()
    category = data.get('category')
    result = delete_post_tax_contribution(category)
    return jsonify(result)


@app.route('/update_post_tax_contribution_order', methods=['POST'])
@cross_origin(supports_credentials=True)
@login_required
def update_post_tax_contribution_order_route():
    card_orders = request.get_json().get('card_orders', [])
    result = update_post_tax_contribution_order(card_orders)
    return jsonify({"success": result})


# @app.route('/updatePaycheckFrequency, methods=["POST"])

if __name__ == '__main__':
    # Port 5001, not 5000: macOS's AirPlay Receiver squats on 5000 by default
    # and will intermittently steal connections meant for this server.
    app.run(debug=True, port=5001)
