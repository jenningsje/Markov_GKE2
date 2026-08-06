import sys, time, logging, os
sys.path.append('../MarkovProprietary/pipelinestages')
sys.path.append('..')
from gemmi import *
from fetch_from_mount import *
from fetch_from_alphafold import *
from fetch_protein import *
from simulate import *
from calibration import *

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

def run_server_health():
    while True:

        try:
            with open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt", "w") as message:
                message.write("test write...")
                time.sleep(5) 
        except Exception as e:
            logger.info("content empty waiting for content")

if __name__ == "__main__":
    run_server_health()