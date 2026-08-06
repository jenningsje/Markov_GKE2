import subprocess
import os
import time
import zipfile
from Run_Markov import *

python_path = "../MarkovProprietary/pipelinestages/make_tables/python/"

zipped_dbs = ["K_elec_dict.py.zip"]
for zipped_db in zipped_dbs:
    zipped_db_path = python_path + zipped_db
    zip_ref = zipfile.ZipFile(zipped_db_path, 'r')
    zip_ref.extractall(python_path)
    zip_ref.close()

os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")

def pipeline():
    names = open("names.txt")
    names_lines = names.readlines()
    names.close()
    val = True
    print("names of proteins")
    print(names_lines)
    while val:
        if names_lines[0]:
            fetch_pdb(names, "prot1.pdb")
        if names_lines[1]:
            fetch_pdb(names, "prot2.pdb")
    val = False
