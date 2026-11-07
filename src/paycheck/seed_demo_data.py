"""Fill a database with obviously fake demo data for the test instance.

Usage (start_test.sh does this for you):
    SINKING_FUNDS_DB=/path/to/sinkingFunds_test.db python seed_demo_data.py

Refuses to touch the real database. Every name is prefixed "Sample" and the
amounts are round, made-up numbers, so test screens can never be mistaken
for real finances.
"""
import os
import sys
from datetime import date, timedelta

REAL_DB = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sinkingFunds.db'))
target = os.environ.get('SINKING_FUNDS_DB')
if not target:
    sys.exit("Set SINKING_FUNDS_DB to the test database path.")
if os.path.abspath(target) == REAL_DB:
    sys.exit("Refusing to seed demo data into the real database.")

# Import after the env var is set: database_constants reads it at import.
from database import (  # noqa: E402
    add_budget_category, add_credit_card, add_post_tax_benefit, add_post_tax_contribution,
    add_pre_tax_benefit, add_savings_category, get_all_budget_categories, get_all_credit_cards,
    get_all_data, get_all_post_tax_benefits, get_all_post_tax_contributions,
    get_all_pre_tax_benefits, get_ally_bank_balance, get_notes, get_paycheck_settings,
    update_ally_bank_balance, update_covered_sub_balances, update_notes,
    update_paycheck_settings_field, update_pending_sub_balances,
    setup_goal_spending_database, spend_from_goal, update_field,
)
from paycheck import save_per_paycheck  # noqa: E402
from utils.database_utils import execute_query  # noqa: E402

today = date.today()
start = today.isoformat()


def months_from_now(n):
    return (today + timedelta(days=30 * n)).isoformat()


# Create every table, then clear the defaults some of them insert.
for getter in (get_all_data, get_all_credit_cards, get_all_budget_categories, get_paycheck_settings,
               get_all_pre_tax_benefits, get_all_post_tax_contributions, get_all_post_tax_benefits,
               get_ally_bank_balance, get_notes):
    getter()
setup_goal_spending_database()
for table in ('savings', 'goal_spending', 'credit_cards', 'budget_categories', 'pre_tax_benefits',
              'post_tax_contributions', 'post_tax_benefits'):
    execute_query(f"DELETE FROM {table}")

# Sinking funds: (name, saved, goal, months until due, icon)
for name, saved, goal, months, icon in [
    ('Sample: Emergency fund', 1000, 5000, 12, 'emergency'),
    ('Sample: Trip to the moon', 250, 1500, 6, 'plane'),
    ('Sample: Dragon food', 100, 400, 3, 'pet'),
    ('Sample: New laptop', 600, 1200, 5, 'laptop'),
    ('Sample: Holiday gifts', 300, 300, 2, 'gift'),
]:
    goal_date = months_from_now(months)
    to_save = save_per_paycheck(float(saved), float(goal), start, goal_date, 'bimonthly')
    add_savings_category(name, saved, goal, goal_date, to_save, icon, start)

# A yearly goal that was just paid, so its spending history and next cycle
# show up: saved 480 of 600, paid the 450 bill, next cycle due a year on.
add_savings_category('Sample: Spaceship registration', 480, 600, months_from_now(0.5), 0, 'car', start)
update_field('repeat_months', 12, 'Sample: Spaceship registration')
reg = [g for g in get_all_data() if g['category'] == 'Sample: Spaceship registration'][0]
spend_from_goal(reg['id'], 450, 'Sample: yearly registration', (today - timedelta(days=3)).isoformat(), True)
reg = [g for g in get_all_data() if g['category'] == 'Sample: Spaceship registration'][0]
update_field('calculated_to_save', save_per_paycheck(float(reg['saved']), 600.0, start, reg['goal_date'], 'bimonthly'),
             'Sample: Spaceship registration')

# Credit cards: (name, posted, pending items, covered items)
for name, posted, pending, covered in [
    ('Sample Visa', 500, [{'name': 'Sample groceries', 'amount': 50, 'source': 'actual'}], []),
    ('Sample Mastercard', 200, [], [{'name': 'Sample dinner split', 'amount': 25, 'source': 'venmo'}]),
    ('Sample Store Card', 0, [], []),
]:
    add_credit_card(name, posted)
    update_pending_sub_balances(name, pending)
    update_covered_sub_balances(name, covered)
update_ally_bank_balance(1000)

# Budget
update_paycheck_settings_field('net_pay', 3000)
update_paycheck_settings_field('pre_tax_retirement', 150)
update_paycheck_settings_field('taxes', 600)
for name, amount in [('Sample: Rent', 1000), ('Sample: Groceries', 200), ('Sample: Fun money', 100)]:
    add_budget_category(name, amount)
add_pre_tax_benefit('Sample: Health insurance', 75)
add_post_tax_contribution('Sample: Roth IRA', 100)
add_post_tax_benefit('Sample: Life insurance', 10)

update_notes("This is the TEST instance. Everything here is made-up sample data.")
print(f"🌱 Seeded demo data into {target}")
