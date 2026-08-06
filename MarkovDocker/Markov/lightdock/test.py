import logging, time, os
from simulate import *

simulation_finished = "simulation finished..."

val1 = True

# open from_font_end.txt and read the lines
from_front_end = open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt")
from_front_end_lines = from_front_end.readlines()

os.chdir("swarm_0")

with open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/message.txt", "w") as message:
    message.write(simulation_finished)
    print(simulation_finished)
    time.sleep(5)

while val1:
    # attempt to fetch the signal from the front end if present

    try:
        # so long as the first line in from_front_end.txt is not "simulation finished..." continue in the while loop
        while from_front_end_lines[0] not in (simulation_finished):
            
            # print the content from the from_front_end.txt to the console
            print(from_front_end_lines[0])
            logging.info("waiting for signal from front end...")

            # open from_front_end.txt and read the lines
            from_front_end_lines = open("/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt")
            from_front_end_lines = from_front_end.readlines()

            # if the content is not "docking simulationn finished..." then return True
            val1 = from_front_end_lines[0] != (simulation_finished)
            print(val1)
            time.sleep(5)

        val1 = False

    except Exception as e:
        print("content empty waiting for content")
        run_command(["cat", "/opt/app/MarkovProprietary/pipelinestages/app/mount/output/from_front_end.txt"])
        time.sleep(5)