import os

from flask import jsonify
from flask_login import LoginManager, UserMixin
from werkzeug.security import check_password_hash

login_manager = LoginManager()
login_manager.session_protection = "strong"


class User(UserMixin):
    def __init__(self, user_id):
        self.id = user_id


SINGLE_USER_ID = "1"


@login_manager.user_loader
def load_user(user_id):
    if user_id == SINGLE_USER_ID:
        return User(SINGLE_USER_ID)
    return None


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "authentication required"}), 401


def verify_credentials(username, password):
    expected_username = os.environ.get("APP_USERNAME")
    expected_password_hash = os.environ.get("APP_PASSWORD_HASH")

    if not expected_username or not expected_password_hash:
        raise RuntimeError("APP_USERNAME and APP_PASSWORD_HASH must be set")

    if username != expected_username:
        return False
    return check_password_hash(expected_password_hash, password)
