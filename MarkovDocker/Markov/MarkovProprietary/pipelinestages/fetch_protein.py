from fetch_from_mount import *
import os
import subprocess
import shutil

names = open("./app/mount/input/names.txt")

names_lines = names.readlines()
names.close()
names1 = names_lines[0]
names2 = names_lines[1]

# fetch receptor name
PDB_ID = search_pdb_by_protein_name(names1)
first_file_path = cifDownload(PDB_ID)
print(first_file_path)
first_file = shutil.move(first_file_path, '../../markov_opensource')

PDB_ID = search_pdb_by_protein_name(names1)
second_file = cifDownload(PDB_ID)
print(second_file)
second_file = shutil.move(first_file_path, '../../markov_opensource')

names = open("./app/mount/input/names.txt")

names_lines = names.readlines()
names.close()
names1 = names_lines[0]
names2 = names_lines[1]

commands = [f"lgd_setup.py -s 1 -g 1000 {first_file} {second_file} --now --noh", 
            "lgd_run.py -s scoring.conf setup.json 1 -c 1", 
            f"lgd_generate_conformations.py ../{first_file} ../{second_file} ../swarm_0/gso_0.out 1"]

# Change the current working directory to directory with fetch_protein.py and run fetch_protein.py
# Define the directory where lgd_setup.py and lgd_run.py are located
lightdock_cmds_dir = '../../markov_opensource'

# Change the current working directory to the script directory
os.chdir(lightdock_cmds_dir)

# Setup lightdock
subprocess.run(commands[0], shell=True, check=True, stdout=subprocess.PIPE)

# Run lightdock
subprocess.run(commands[1], shell=True, check=True, stdout=subprocess.PIPE)