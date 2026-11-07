import os

# Absolute path so the db never depends on the directory the server was
# started from (a relative path made SQLite silently create a fresh, empty
# db when launched from anywhere other than src/paycheck).
#
# Override with SINKING_FUNDS_DB to point the server at a different db,
# e.g. the scratch copy start_test.sh creates.
_PAYCHECK_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DATABASE_PATH = os.path.join(_PAYCHECK_DIR, 'sinkingFunds.db')

DATABASE_NAME = os.path.abspath(os.environ.get('SINKING_FUNDS_DB', DEFAULT_DATABASE_PATH))
