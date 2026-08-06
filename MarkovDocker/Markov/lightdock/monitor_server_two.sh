#!/bin/bash

# check if these files are present to regulate server activity
SIMULATION_START_DIR="lightdock.info"
SIMULATION_END_DIR="/opt/app/MarkovProprietary/pipelinestages/app/mount/output/lightdock_0.pdb"

# regulate the activity of this server
SERVER_PROCESS="server_two.js"

# switch to the mount directory
cd /opt/app/MarkovProprietary/pipelinestages/app/mount
# begin by starting up server_two
node server_one.js

# regulate server activity
while true; do

    # check to see if the simulation has started
    if [ -e "$SIMULATION_START_DIR" ] && [ ! -f "$SIMULATION_END_DIR" ] && [ pgrep -f "$SERVER_PROCESS" > /dev/null]; then
        # stop server when simulation starts
        pkill -f server_two.js
        echo server_two_off

    # check to see if the simulation ended
    elif [ -f "$SIMULATION_END_DIR" ]; then
        # restart server when simulation ends
        node server_two.js
        echo server_two_on
    fi

    sleep 1
done