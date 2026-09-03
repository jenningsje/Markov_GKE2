import sys, time, logging, os
sys.path.append('/opt/app/MarkovProprietary/pipelinestages')
sys.path.append('..')
from gemmi import *
from fetch_from_mount import *
from fetch_from_alphafold import *
from fetch_protein import *
from simulate import *
from calibration import *
import shutil

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

from_alphafold = "file not available on the protein databank fetching file from the alphafold databank instead..."
from_pdb = "fetching from the pdb..."
simulation_finished = "docking simulation finished..."

user_id = None

while user_id is None:
    if len(sys.argv) > 1:
        user_id = sys.argv[1]
        break

    logging.info("Waiting for user ID...")
    time.sleep(1)

logging.info(f"Worker assigned to user {user_id}")

def Markov():
    while True:

        logging.info(f"user_id: {user_id}")

        try:

            logging.info(f"current directoy is: {os.getcwd()} test1")

            # make swarm_0 the starting directory so attempt to go into it
            try:
                logging.info(f"current directory is {os.getcwd()} test2")
                os.chdir("/opt/app/lightdock/swarm_0")

            # otherwise it is likely that the swarm directoy is the current one, get the current directory
            except Exception as e:
                logging.info(f"current directory is {os.getcwd()} test3")

            # attempt to remove swarm_0
            print(f"current directory is {os.getcwd()}")
            cleanup_lightdock()

            try:
                with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user--{user_id}/output/from_front_end.txt", 'w'):
                    pass

            except Exception as e:
                os.chdir(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input")
                with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt", 'w'):
                    pass

            # fetch the current signal from the front end
            from_front_end_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt")

            if from_front_end_size == 0:
                with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/message.txt", "w") as message:
                    message.write("fetch the next two proteins...")
                    logger.info("fetch the next two proteins...")
                    time.sleep(1) 

            # retrieve the size of file
            open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "w")
        
            # while the size of the file is zero wait for user input
            input_path = f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt"

            while True:
                file_size = os.path.getsize(input_path)
                print(file_size)

                if file_size > 0:
                    break

                logger.info("waiting for user input")
                time.sleep(1)

            with open(input_path, "r") as names:
                names_lines = names.readlines()

            logger.info(f"names_lines: {names_lines}")

            # fetch user input
            names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
            names_lines = names.readlines()
            logger.info(names_lines[0])

            # fetch the first protein if present otherwise tell the user to try another query
            fetch_protein(names_lines[0], "/opt/app/lightdock/prot1.pdb")
            logger.info("current working directory:" + os.getcwd())

            # erase the data from names.txt
            logger.info("test")
            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "w"):
                pass

            while os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt") == 0:
                logger.info(os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt"))
                time.sleep(1)

            # fetch the current signal from the front end
            from_front_end = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt")
            from_front_end_lines = from_front_end.readlines()
            first_front_end_line = from_front_end_lines[0].split('\n')[0].strip()

            # wait for signal from front end to arrive to the backend
            while first_front_end_line not in (from_alphafold, from_pdb):
                logger.info(f"first_front_end_line is: {first_front_end_line}")
                logger.info(f"from_pdb is: {from_pdb}")
                logger.info(f"waiting for signal from front end...")
                from_front_end = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt")
                from_front_end_lines = from_front_end.readlines()
                first_front_end_line = from_front_end_lines[0].split('\n')[0].strip()
                val = first_front_end_line == from_pdb
                logger.info(val)
                time.sleep(1)

                # delete names.txt file if present
                if os.path.isfile(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt"):
                    os.remove(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")

                # if a bad query was made then allow the user to try another query, this will repeat until a protein is obtained
                if first_front_end_line == "that protein does not exist in the protein databank or the alphafold databank, please try another query":
                    logger.info("inside if statement")

                    # fetch user input and create an empty names.txt file
                    with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "r+") as names:
                        # read the lines of names.txt
                        names_lines = names.readlines()

                    # get the size of the names.txt file
                    file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                
                    # while the size of the file is zero wait for user input
                    while (file_size == 0):
                        # fetch user input
                        names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                        names_lines = names.readlines()
                        file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                        logger.info("no user input")
                        time.sleep(1)

                    # fetch user input
                    names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                    names_lines = names.readlines()
                    logger.info(names_lines[0])
                    fetch_protein(names_lines[0], "/opt/app/lightdock/prot1.pdb")
                time.sleep(1) 

            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt"):
                pass

            # fetch user input and create an empty names.txt file
            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "a+") as names:
                # read the lines of names.txt
                names_lines = names.readlines()
                time.sleep(1) 
            
            # check the size of the file again
            new_file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")

            # erase the data from the message
            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/message.txt", "w") as message:
                message.write("fetch the next protein...")
                logger.info("fetch the next protein...")
                time.sleep(1) 

            # while the size of the file is zero wait for user input
            while (new_file_size == 0):
                # fetch user input
                names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                names_lines = names.readlines()
                new_file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                logger.info("no user input")
                time.sleep(1)

            # fetch user input
            names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
            names_lines = names.readlines()
            logger.info(names_lines[0])
            logger.info("end of for loop")

            fetch_protein(names_lines[0], "/opt/app/lightdock/prot2.pdb")

            # erase the data from names.txt
            logger.info("test")
            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "w"):
                pass

            # fetch the current signal from the front end
            from_front_end = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/from_front_end.txt")
            from_front_end_lines = from_front_end.readlines()
            first_front_end_line = from_front_end_lines[0].split('\n')[0].strip()

            while len(first_front_end_line) == 0:
                logger.info("test")
                time.sleep(1) 

                # delete names.txt file if present
                if os.path.isfile(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt"):
                    os.remove(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")

                # if a bad query was made then allow the user to try another query, this will repeat until a protein is obtained
                if first_front_end_line == "that protein does not exist in the protein databank or the alphafold databank, please try another query":
                    logger.info("inside if statement")

                    # fetch user input and create an empty names.txt file
                    with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt", "a+") as names:
                        # read the lines of names.txt
                        names_lines = names.readlines()
                        time.sleep(1)

                    # get the size of the names.txt file
                    file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")

                    # while the size of the file is zero wait for user input
                    while (file_size == 0):
                        # fetch user input
                        names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                        names_lines = names.readlines()
                        file_size = os.path.getsize(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                        logger.info("no user input")
                        time.sleep(1)

                    # fetch user input
                    names = open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/names.txt")
                    names_lines = names.readlines()
                    logger.info(names_lines[0])
                    fetch_protein(names_lines[0], "/opt/app/lightdock/prot2.pdb")

                time.sleep(1) 

            with open(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/output/message.txt", "w") as message:
                message.write("docking simulator ready...")
                logger.info("docking simulator ready...")
                time.sleep(1) 

            os.chdir("/opt/app/lightdock")
            time.sleep(1)
            
            while not os.path.isfile(f"/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input/ping.json"):
                time.sleep(1)

            simulator()

            try:
                os.makedirs("swarm_0", exist_ok=True)
            except Exception as e:
                # Log the exception and continue the loop
                logger.error(f"Error occurred: {e}", exc_info=True)
                time.sleep(1)

        except Exception as e:
            # Log the exception and continue the loop
            logger.error(f"Error occurred: {e}", exc_info=True)
            time.sleep(1)

        os.chdir(f'/opt/app/MarkovProprietary/pipelinestages/app/mount/user-{user_id}/input')

if __name__ == "__main__":
    Markov()