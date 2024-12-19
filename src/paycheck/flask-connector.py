from flask import Flask, request, jsonify
from datetime import datetime
from paycheck import saved_by_paycheck, save_per_paycheck

app = Flask(__name__)

## Calculate Functions
@app.route('/saved_by_paycheck', methods=['GET'])
def saved_by_paycheck_route():
    try:
        saved = float(request.args.get('saved'))
        goal = float(request.args.get('goal'))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        frequency = request.args.get('frequency')
        
        paycheck_schedule = saved_by_paycheck(saved, goal, start_date, end_date, frequency)
        return jsonify(paycheck_schedule), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/save_per_paycheck', methods=['GET'])
def save_per_paycheck_route():
    try:
        saved = float(request.args.get('saved'))
        goal = float(request.args.get('goal'))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        frequency = request.args.get('frequency')
        to_save = save_per_paycheck(saved, goal, start_date, end_date, frequency)
        
        return jsonify({"amount": to_save}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True)
