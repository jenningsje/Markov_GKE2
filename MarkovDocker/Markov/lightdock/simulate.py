import os
import subprocess
import logging
import time
from renew import *
from calibration import *
import math

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

message_path = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt"

from_front_end_path = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt"

simulation_finished = "docking simulation finished..."

lightdock_to_front_end = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt"

lightdock_to_message = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt"

def messager(message):
	try:
		with open(lightdock_to_message, "r+") as m:
			m.write(message)
			logging.info(f"the message is {message} in messager")
			time.sleep(5)
	except:
		logging.error(f"message {' '.join(message)}")

def write_to_from_frontend(message):
	try:
		with open(from_front_end_path, "w") as m:
			m.write(message)
			print(message)
			time.sleep(5) 
	except:
		logging.error(f"message {' '.join(message)}")

def run_command(command):
	try:
		result = subprocess.run(command, check=True, capture_output=True, text=True)
		logging.info(f"Command succeeded: {' '.join(command)}")
		logging.info(f"Output: {result.stdout}")
	except subprocess.CalledProcessError as e:
		logging.error(f"Command failed: {' '.join(command)}")
		logging.error(f"Error: {e.stderr}")

def simulator():
	
	print(os.getcwd())
	# Prompt the user to select the number of cores for the simulation
	cores = calibrate_simulation("select the number of cores for the simulation from 1 to 4 it is recommended that you choose 1 core...", lightdock_to_front_end, acceptable_number_of_cores)
	
	# Prompt the user to select the number of glowworms for the simulation
	glowworms = calibrate_simulation("select the number of glowworms for the simulation from 1 to 100,000,000...", lightdock_to_front_end, acceptable_number_of_glowworms)
	
	# Prompt the user to select the number of steps for the simulation
	steps = calibrate_simulation("select the number of steps for the simulation from 1 to 100,000,000...", lightdock_to_front_end, acceptable_number_of_steps)

	logging.info(f"the type of cores is: {type(cores)}, the type of glowworms is:  {type(glowworms)}, the type of steps is: {type(steps)}")
	logging.info(f"the input for cores is: {cores}, the intput for glowworms is: {glowworms}, the input for steps is: {steps}") 
    
	logging.info(f"the current working directory in simulate is {os.getcwd()}")

	# Set up simulation
	messager("setting up simulation...")
	run_command(["lgd_setup.py", "-s", "1", "-g", glowworms, "prot1.pdb", "prot2.pdb", "--now", "--noh"])
	if not os.path.exists("past_setup"):
		os.mkdir("past_setup")

	# Run simulation
	messager("running simulation...")
	run_command(["lgd_run.py", "-s", "scoring.conf", "setup.json", steps, "-c", cores])
	clean_directory()
	if not os.path.exists("past_run"):
		os.mkdir("past_run")
    
	os.makedirs("swarm_0", exist_ok=True)  
	os.chdir("swarm_0")
	messager("generating conformations...")
	run_command(["lgd_generate_conformations.py", "/opt/app/lightdock/prot1.pdb", "/opt/app/lightdock/prot2.pdb", f"gso_0.out", "1"])
	if not os.path.exists("generated_conformations"):
		os.mkdir("generated_conformations")

	try:
		run_command(["rm", "-rf", "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/lightdock_0.pdb"]);
	except:
		logging.error("no file present in backend.")

	run_command(["mv", "lightdock_0.pdb", "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/lightdock_0.pdb"])

	simulation_finished = "simulation finished..."

	val1 = True

	# open from_font_end.txt and read the lines
	from_front_end = open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt")
	from_front_end_lines = from_front_end.readlines()

	with open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt", "w") as message:
		message.write(simulation_finished)
		print(simulation_finished)
		time.sleep(5)

	while val1:
		try:
			with open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt") as from_front_end:
				from_front_end_lines = from_front_end.readlines()
			
			while from_front_end_lines and from_front_end_lines[0].strip() != simulation_finished:
				print(from_front_end_lines[0])
				logging.info("Waiting for signal from front end...")
				
				time.sleep(5)
				with open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt") as from_front_end:
					from_front_end_lines = from_front_end.readlines()
				
				val1 = from_front_end_lines and from_front_end_lines[0].strip() != simulation_finished
				print(val1)
		
			val1 = False
		except Exception as e:
			logging.error(f"Error while checking front-end signal: {e}", exc_info=True)
			print("Content empty, waiting for content")
			run_command(["cat", "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt"])
			time.sleep(5)
		
		val1 = False

	os.chdir("..")
	print(os.getcwd())
	os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")

	logging.info(f"current working directory: {os.getcwd()} changing to /app/mount/input")