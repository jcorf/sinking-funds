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

print(stringToDate("2024-01-01"))
print(dateToString(datetime(2024, 1, 1, 0, 0)))