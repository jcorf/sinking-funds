from datetime import datetime, timedelta

def remaining(saved, goal):
    return(goal - saved)

def previous_weekday(date):
    if date.weekday() == 5:  # Saturday
        return date - timedelta(days=1)
    elif date.weekday() == 6:  # Sunday
        return date - timedelta(days=2)
    return date

def dateToString(date, format="%Y-%m-%d"):
    return date.strftime(format)

def stringToDate(datestring, format="%Y-%m-%d"):
    return datetime.strptime(datestring, format)

def nowString():
    return dateToString(datetime.now())

def listToDict(values, keys):
    return {keys[i]: values[i] for i in range(len(keys))}


# def validateInput(saved, goal, start_date, end_date):
