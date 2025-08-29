from datetime import datetime, timedelta
from utils.utils import *

def _remaining_paychecks(start_date, end_date):
    if start_date > end_date:
        return (0, [])
    
    # Initialize the number of paychecks and the list of paycheck dates
    paychecks = 0
    paycheck_dates = []

    # Loop through each month in the period
    current_date = start_date
    while current_date <= end_date:
        # Check the 15th of the month
        fifteenth_of_month = previous_weekday(current_date.replace(day=15))
        if fifteenth_of_month >= start_date and fifteenth_of_month <= end_date:
            paychecks += 1
            paycheck_dates.append(fifteenth_of_month)
        
        # Check the last day of the month (30th or 31st)
        next_month = current_date.replace(day=28) + timedelta(days=4)  # This will always jump to the next month
        last_day_of_month = next_month - timedelta(days=next_month.day)
        last_weekday_of_month = previous_weekday(last_day_of_month)
        if last_weekday_of_month >= start_date and last_weekday_of_month <= end_date:
            paychecks += 1
            paycheck_dates.append(last_weekday_of_month)

        # Move to the next month
        current_date = next_month.replace(day=1)

    return (paychecks, paycheck_dates)



def saved_by_paycheck(saved, goal, start_date, end_date):
    num_paychecks_left, paycheck_dates = _remaining_paychecks(stringToDate(start_date),stringToDate(end_date))
    if num_paychecks_left == 0:
        return {}
    to_save = remaining(saved,goal) / num_paychecks_left
    paycheck_schedule = {dateToString(date): ((index + 1) * to_save) + saved for index, date in enumerate(paycheck_dates)}

    return paycheck_schedule

def remaining_paychecks(start_date, end_date):
    print("HEYYY", start_date, end_date)
    num_paychecks_left, paycheck_dates = _remaining_paychecks(stringToDate(start_date),stringToDate(end_date))
    return num_paychecks_left

def save_per_paycheck(saved, goal, start_date, end_date):
    num_paychecks_left, paycheck_dates = _remaining_paychecks(stringToDate(start_date),stringToDate(end_date))
    if num_paychecks_left == 0:
        return 0
    to_save = remaining(saved,goal) / num_paychecks_left
    return(round(to_save,3))

#save_per_paycheck(100, 200, "2024-12-01","2025-01-01")
#print(saved_by_paycheck(100, 200, "2024-12-01","2025-01-01"))