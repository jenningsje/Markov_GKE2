import os
import logging
import sys


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)


# ============================================================
# USER ID
# ============================================================

def get_user_id():
    """
    Get and validate the user ID assigned to this LightDock worker.

    The Kubernetes/Node layer must pass the user ID as argv[1].

    MARKOV_USER_ID is also supplied as a secondary safeguard.

    Examples:

        python Run_Markov.py 1
        python Run_Markov.py 3

    Both argv[1] and MARKOV_USER_ID must identify the same user
    when MARKOV_USER_ID is present.
    """

    argv_user_id = ""

    if len(sys.argv) > 1:
        argv_user_id = str(sys.argv[1]).strip()

    env_user_id = os.environ.get("MARKOV_USER_ID", "").strip()

    # --------------------------------------------------------
    # argv[1] is mandatory
    # --------------------------------------------------------

    if not argv_user_id:
        logging.critical(
            "FATAL: Run_Markov.py was started without argv[1] user ID"
        )

        if env_user_id:
            logging.critical(
                f"MARKOV_USER_ID exists ({env_user_id}) "
                "but argv[1] is missing"
            )

        raise RuntimeError(
            "Run_Markov.py requires a user ID as argv[1]"
        )

    # --------------------------------------------------------
    # Validate that the ID is numeric
    # --------------------------------------------------------

    if not argv_user_id.isdigit():
        logging.critical(
            f"FATAL: invalid user ID in argv[1]: {argv_user_id!r}"
        )

        raise RuntimeError(
            f"Invalid user ID: {argv_user_id!r}"
        )

    # --------------------------------------------------------
    # MARKOV_USER_ID is a secondary safeguard
    # --------------------------------------------------------

    if not env_user_id:
        logging.warning(
            "MARKOV_USER_ID environment variable is missing"
        )

    elif env_user_id != argv_user_id:
        logging.critical(
            f"FATAL: user ID mismatch: "
            f"argv={argv_user_id}, "
            f"MARKOV_USER_ID={env_user_id}"
        )

        raise RuntimeError(
            "User ID mismatch between argv[1] and MARKOV_USER_ID"
        )

    # --------------------------------------------------------
    # Final worker identity
    # --------------------------------------------------------

    logging.info(
        "============================================================"
    )

    logging.info(
        f"Run_Markov.py STARTED FOR USER ID: {argv_user_id}"
    )

    logging.info(
        f"sys.argv: {sys.argv}"
    )

    logging.info(
        f"MARKOV_USER_ID: "
        f"{os.environ.get('MARKOV_USER_ID')}"
    )

    logging.info(
        "============================================================"
    )

    logging.info(
        f"Worker assigned to user {argv_user_id}"
    )

    return argv_user_id