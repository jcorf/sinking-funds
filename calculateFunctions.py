from datetime import datetime, timedelta

"""
Helper Functions Documentation:

1. previous_weekday():
   -------------------
   Calculate the previous weekday before the given date.


2. remaining_paychecks:
   ------------------------
   Calculate the number of remaining paychecks in a semi-monthly pay period.


3. save_per_paycheck:
   ----------------------
   Calculate the amount to save per paycheck to reach a savings goal by a goal date.
   
"""

def remaining(saved, goal):
    return(goal - saved)

def previous_weekday(date):
    if date.weekday() == 5:  # Saturday
        return date - timedelta(days=1)
    elif date.weekday() == 6:  # Sunday
        return date - timedelta(days=2)
    return date

def remaining_paychecks(start_date, end_date):
    if start_date > end_date:
        return 0
    
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

    # Print the list of paycheck dates
    #for date in paycheck_dates:
        #print(date.strftime("%Y-%m-%d"))

    return (paychecks, paycheck_dates)

def save_per_paycheck(saved,goal,start_date,end_date, printValues=False):
    num_paychecks_left, paycheck_dates = remaining_paychecks(start_date,end_date)
    to_save = remaining(saved,goal) / num_paychecks_left
    if printValues:
        print(start_date.strftime("%Y-%m-%d"), " - $", saved, " -- CURRENT", sep="")
    
        for index, date in enumerate(paycheck_dates):
            cum_amount = (index + 1) * to_save
            current_date = date.strftime("%Y-%m-%d")
            formatted_value = f"{cum_amount+saved:.2f}"
            print(f"{current_date} - ${formatted_value}")
    return(round(to_save,3))