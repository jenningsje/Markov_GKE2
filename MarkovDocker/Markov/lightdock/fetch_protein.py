import sys, shutil, time, subprocess, logging, os
sys.path.append("/opt/app/MarkovProprietary/pipelinestages")
sys.path.append('..')
from gemmi import *
from fetch_from_mount import *
from fetch_from_alphafold import *

# change directory to app/mount/input
os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")

def message(text):
    f = open("message.txt", "w")
    f.write(text)
    f.close

# fetch user input
with open("names.txt", "a+") as names:
    # read the lines of names.txt
    names_lines = names.readlines()

def fetch_pdb(protein, new_file_path):
    # fetch name of protein 1
    PDB_ID = search_pdb_by_protein_name(protein)

    # fetch file path of protein 1
    prot_file_path = cifDownload(PDB_ID)
    # rename protein to prot1.pdb and move file to lightdock directory
    shutil.move(prot_file_path, new_file_path)
    print(os.getcwd())
    os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
    message("fetching from the pdb...")
    print("fetching from the pdb...")
    os.chdir("../input")

def fetch_AlphaFold(protein, new_file_path):
    # fetch name of protein 1
    prot_file_path = get_AlphaFold_data(protein)
    # rename protein to prot1.pdb and move file to lightdock directory
    shutil.move(prot_file_path, new_file_path)
    print(os.getcwd())
    os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
    message("file not available on the protein databank fetching file from the alphafold databank instead...")
    print("file not available on the protein databank fetching file from the alphafold databank instead...")
    os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")

def fetch_protein(protein, file_path):
    # attempt to fetch the name of the protein from the protein databank
    try:
        print("checking the protein databank...")
        message("checking pdb...")
        fetch_pdb(protein, file_path)
    except:
        # attempt to fetch the name of the protein from the AlphaFold databank
        print("checking the Alphafold databank...")
        message("checking the alphafold databank...")
        try:
            fetch_AlphaFold(protein, file_path)
        except:
            os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
            message("that protein does not exist in the protein databank or the alphafold databank, please try another query")
            print("that protein does not exist in the protein databank or the alphafold databank, please try another query")
            os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/input")
