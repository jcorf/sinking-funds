from schedules import bimonthly

def saved_by_paycheck(saved, goal, start_date, end_date, frequency):
    if frequency == "bimonthly":
        return bimonthly.saved_by_paycheck(saved, goal, start_date, end_date)

def save_per_paycheck(saved, goal, start_date, end_date, frequency):
    if frequency == "bimonthly":
        return bimonthly.save_per_paycheck(saved, goal, start_date, end_date)

