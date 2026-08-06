import os
import logging
import time
from renew import *
import shutil


# Specify the directory and file name
input_dir = "/opt/app/MarkovProprietary/pipelinestages/app/mount/input"
input_file = 'names.txt'
input_path = os.path.join(input_dir, input_file)

# path to message for the user
message_path = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt"

# from_front_end_path
from_front_end_path = "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt"

# acceptable number of cores
acceptable_number_of_cores = range(1, 5)

# acceptable number of glowworms
acceptable_number_of_glowworms = range(1, 100000001)

# acceptable number of steps
acceptable_number_of_steps = range(1, 100000001)

# fetch the user input for a specified parameter, a message and certain acceptable paramaters

def cleanup_lightdock():
    # List of files and directories to remove
    paths = [
        "init",
        "lightdock.egg-info",
        "lightdock_prot1.pdb",
        "lightdock_prot1_mask.npy",
        "lightdock_prot2.pdb",
        "lightdock_prot2_mask.npy",
        "lightdock.info",  # <- Added missing comma here
        "prot1.pdb",
        "prot2.pdb",
        "swarm_0"
    ]

    for path in paths:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path)  # Remove directory
                print(f"Deleted directory: {path}")
            else:
                os.remove(path)  # Remove file
                print(f"Deleted file: {path}")
        else:
            print(f"Not found: {path}")

cleanup_lightdock()


def fetch_input(message):

	message_size = os.path.getsize(message_path) 

	if message_size != 0:
		with open(message_path, 'r+') as n_path:
		# Truncate the file to 0 bytes
			print()
			n_path.truncate(0)

	logging.info(f"message_size is: {message_size}")

	# tell the user to specify the number of steps, cores or glowworms and attempt to fetch the user input if it is not a number between 1 and 4
	with open(message_path, "r+") as m:
		m.write(message)
		logging.info(message)
		time.sleep(5)

	print("test2")
	# tell the user to specify the number of steps, cores or glowworms and attempt to fetch the user input if it is not a number between 1 and 4
	with open(message_path, "r+") as m:
		m.write(message)
		print(message)
		time.sleep(5)
	
	with open(from_front_end_path) as from_front_end:
		from_front_end_lines = from_front_end.readlines()
		logging.info(f"from_front_end_lines: {from_front_end_lines}")
	print("test3")

	if os.path.exists(input_path):
		os.remove(input_path)
	else:
		logging.info(f"The file at {input_path} does not exist.")

	from_front_end_size = os.path.getsize(from_front_end_path)
	print(f"current directory is {os.getcwd()}")

	if from_front_end_size != 0:
		if os.path.exists(from_front_end_path):
			os.remove(from_front_end_path)
		else:
			logging.info(f"The file at {from_front_end_path} does not exist.")
		
	with open(from_front_end_path, "w") as f1:
		pass

	while len(from_front_end_lines) == 0:
		time.sleep(5)

	os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")
	logging.info(f"the lines from the front end are: {from_front_end_lines}")
	logging.info(f"the first element is: {from_front_end_lines[0]}")
	logging.info(f"the message is: {message}")
	logging.info(f"test the logic statement: {from_front_end_lines[0] != message}")

	while (from_front_end_lines[0] != message or len(from_front_end_lines) == 0):
		time.sleep(5)
		logging.info(from_front_end_lines[0])
		os.chdir("/opt/app/lightdock")
		logging.info("waiting for signal from front end...")
		from_front_end = open(from_front_end_path, "r+")
		from_front_end_lines = from_front_end.readlines()

	logging.info(f"current working directory is: {os.getcwd()}")
	os.chdir("/opt/app/lightdock")

	# Check if the file exists
	if not os.path.exists(input_path):
		# If the file doesn't exist, create it
		with open(input_path, 'w') as f:
			f.write('')  # You can add initial content here if needed
		logging.info(f"{input_file} has been created.")
	else:
		logging.info(f"{input_file} already exists.")

	# retrieve the size of file
	print(f"current directory is this one {os.getcwd()}")
	# Open the file in write mode

	input_size = os.path.getsize(input_path) 

	if input_size != 0:
		if os.path.exists(input_path):
			os.remove(input_path)
		else:
			logging.info(f"The file at {input_path} does not exist.")

	with open(input_path, "w") as f2:
		pass

	input_size = os.path.getsize(input_path) 
	logging.info(f"input_size is: {input_size}")
	
	# while the size of the file is zero wait for user input
	while (input_size == 0):
		# fetch user input
		input = open(input_path, "r+")
		input_lines = input.readlines()
		input_size = os.path.getsize(input_path)
		logging.info("no user input 1")
		time.sleep(5)
	
	with open(input_path, "w") as f3:
		pass

	params = input_lines
	return params
	
# fetch a certain number of parameters and tell the user if that specified number is acceptable
def calibrate_simulation(message, message_path, acceptable_params):

	params = fetch_input(message)

	# runs until the number of paramters inserted are unacceptable
	while int(params[0].strip('"\n')) not in acceptable_params:
		# tell the user the calibration failed
		logging.info("params" + params[0])
		logging.info("acceptable_params" + str(acceptable_params))
		with open(message_path, "r+") as m:
			m.write("calibration failed, please try again")
			time.sleep(5)

			# attempt to recalibrate the simulation
			params = fetch_input(message)
			m.write("calibrating...")
			logging.info("calibrating...")

	# tell the user at the front end that the simulation is being calibrated
	with open(message_path, "r+") as m:
		m.write("calibrated...")
		logging.info("calibrated...")
		time.sleep(5)

	calibrated_params = params[0].strip('"\n')
	
	return calibrated_params
