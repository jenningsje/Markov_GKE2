import sys
import time
import logging

logging.basicConfig(level=logging.INFO)

user_id = None

while user_id is None:
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
        break

    logging.info("Waiting for user ID...")
    time.sleep(1)

logging.info(f"Worker assigned to user {user_id}")
