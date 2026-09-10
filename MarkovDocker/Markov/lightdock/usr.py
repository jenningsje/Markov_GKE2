import os
import logging
import time
import sys

# ============================================================
# USER ID
# ============================================================

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set the log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # Log message format
    handlers=[
        logging.FileHandler("app.log"),  # Log to a file
        logging.StreamHandler()  # Log to the console
    ]
)

logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO)

user_id = None

while user_id is None:
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
        break

    logging.info("Waiting for user ID...")
    time.sleep(1)

logging.info(f"Worker assigned to user {user_id}")

def get_user_id():
    """
    Run_Markov.py MUST receive a user ID.

    The Node/Kubernetes layer passes it as argv[1].
    MARKOV_USER_ID is also supplied as a secondary safeguard.

    NEVER wait indefinitely for a missing user ID.
    """

    argv_user_id = None

    if len(sys.argv) > 1:
        argv_user_id = str(sys.argv[1]).strip()

    env_user_id = os.environ.get(
        "MARKOV_USER_ID",
        ""
    ).strip()

    if not argv_user_id:
        logging.critical(
            "FATAL: Run_Markov.py was started without argv[1] user ID"
        )

        if env_user_id:
            logging.critical(
                f"MARKOV_USER_ID exists ({env_user_id}) but argv[1] is missing"
            )

        raise RuntimeError(
            "Run_Markov.py requires a user ID as argv[1]"
        )

    if not env_user_id:
        logging.warning(
            "MARKOV_USER_ID environment variable is missing"
        )

    if env_user_id and env_user_id != argv_user_id:
        logging.critical(
            f"FATAL: user ID mismatch: argv={argv_user_id}, "
            f"MARKOV_USER_ID={env_user_id}"
        )

        raise RuntimeError(
            "User ID mismatch between argv[1] and MARKOV_USER_ID"
        )

    return argv_user_id

logging.info(
    f"============================================================"
)

logging.info(
    f"Run_Markov.py STARTED FOR USER ID: {user_id}"
)

logging.info(
    f"sys.argv: {sys.argv}"
)

logging.info(
    f"MARKOV_USER_ID: {os.environ.get('MARKOV_USER_ID')}"
)

logging.info(
    f"============================================================"
)

logging.info(f"Worker assigned to user {user_id}")