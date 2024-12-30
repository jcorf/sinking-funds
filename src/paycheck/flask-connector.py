import random

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

app = Flask(__name__)
cors = CORS(app) # allow CORS for all domains on all routes.
app.config['CORS_HEADERS'] = 'Content-Type'

from database import (update_field, setup_database, delete_database,
                      add_db, get_category_info, delete_row_based_on_category, get_all_data, get_categories
                     )
from paycheck import saved_by_paycheck, save_per_paycheck
from utils.utils import nowString

app = Flask(__name__)
CORS(app)

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


@app.route('/saved_by_paycheck', methods=['GET'])
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
@cross_origin()
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
@cross_origin()
def update_to_save_single_route():
    on_value, on_field = get_on_args()
    start_date = get_start_date_args()
    to_save = update_to_save_single(on_value, on_field, start_date)
    return jsonify(to_save)

@app.route('/recalculate_all', methods=['POST','PUT'])
@cross_origin()
def update_to_save_all_route():
    start_date = get_start_date_args(request.get_json())
    categories = get_categories()
    for category in categories:
        update_to_save_single(category, "category", start_date)
    return jsonify({"message" : "recalculated all"})

@app.route('/add_category', methods=['POST', 'PUT'])
def add_category_route():
    category, saved, goal, goal_date = get_args(['category', 'saved', 'goal', 'goal_date'], request.get_json())
    start_date = get_start_date_args(request.get_json())
    to_save = save_per_paycheck(float(saved), float(goal), start_date, goal_date, "bimonthly")
    result = add_db(category, float(saved), float(goal), goal_date, to_save)
    return jsonify(result)


@app.route('/remove_category', methods=['DELETE'])
def remove_category_route():
    on_value, on_field = get_on_args(request.get_json())
    result = delete_row_based_on_category(on_value, on_field)
    return jsonify(result)


@app.route('/get_category_info', methods=['GET'])
def get_category_info_route():
    on_field = request.args.get('on_field', 'category')
    on_value = request.args.get('on_value')
    result = get_category_info(on_value, on_field)
    return jsonify(result)


@app.route('/get_data', methods=['GET'])
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
def setup_database_route():
    result = setup_database()
    return jsonify(result)


@app.route('/delete_database', methods=["POST"])
def delete_database_route():
    result = delete_database()
    return jsonify(result)


@app.route('/add_mock_data', methods=['POST'])
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

# @app.route('/updatePaycheckFrequency, methods=["POST"])

if __name__ == '__main__':
    app.run(debug=True)
