import os, subprocess

file_list = ["lightdock_prot1_mask.npy", "setup.json", "lightdock_prot2.pdb", "lightdock_prot2_mask.npy", "lightdock_prot1.pdb", "lightdock.info", "prot1.pdb", "prot2.pdb"] 

# clean directory

def renew():
    for file in file_list:
        os.remove(file)

    subprocess.run(["rm", "-rf", "swarm_0", "init", "past_setup", "past_run"])