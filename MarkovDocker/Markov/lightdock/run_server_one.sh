#!/bin/bash

# Define the directory where the files should be checked/created
directory="/opt/app/MarkovProprietary/pipelinestages/app/mount/output"

# List of files to check/create
files=("from_front_end.txt" "message.txt" "../input/data.json", "../input/names.txt")

# Loop through each file and check if it exists
for file in "${files[@]}"; do
    if [ ! -f "$directory/$file" ]; then
        # If file doesn't exist, create it
        touch "$directory/$file"
        echo "Created file: $directory/$file"
    else
        echo "File already exists: $directory/$file"
    fi
done

# switch to directory with the servers and install necessary files
cd /opt/app/MarkovProprietary/pipelinestages/app/mount
node server_one.js
