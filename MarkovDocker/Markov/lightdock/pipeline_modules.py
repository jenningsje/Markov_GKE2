import sys, shutil, time, subprocess, logging, os
sys.path.append('../MarkovProprietary/pipelinestages')
sys.path.append('..')
from gemmi import *
from fetch_from_mount import *
from fetch_from_alphafold import *

def create_empty_file(file_name):
    try:
        with open(file_name, 'w') as f:
            pass  # This creates an empty file
        print(f"Empty file '{file_name}' created successfully.")
    except IOError:
        print(f"Unable to create empty file '{file_name}'.")

# Example usage:
file_name = "empty_file.txt"
create_empty_file(file_name)

def message(text):
    f = open("message.txt", "w")
    f.write(text)
    f.close

def fetch_pdb(name, pdb_file):
    lightdock_path = os.path.abspath("/opt/app/lightdock")
    print(os.getcwd())
    # attempt to fetch the name of the protein from the protein databank
    try:
        # fetch name of protein 1
        PDB_ID = search_pdb_by_protein_name(name)
        # fetch file path of protein 1
        prot_file_path = cifDownload(PDB_ID)
        # rename protein to prot1
        os.rename(prot_file_path, pdb_file)
        # move file to lightdock
        shutil.move(pdb_file, lightdock_path)
        # tell user that the file is available on the protein databank
        os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
        print(os.getcwd())
        message("fetching from the pdb…")
        os.chdir("../input")
    except:
        # attempt to fetch the name of the protein from the AlphaFold databank
        try:
            # retrieve the file path for the pdb file
            prot_file_path = get_AlphaFold_data(name)
            # rename protrein to prot1
            os.rename(prot_file_path, pdb_file)
            # move file to lightdock
            shutil.move(pdb_file, lightdock_path)
            # tell user that the file is available in the alphafold databank
            os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
            print(os.getcwd())
            message("file not available on the protein databank fetching file from the alphafold databank instead")
            
            os.chdir("../input")
        # send error message to the front end if the pdb does not exist
        except:
            os.chdir("/opt/app/MarkovProprietary/pipelinestages/app/mount/output")
            message("that protein does not exist in the protein databank or the alphafold databank, please try another query")
            os.chdir("../input")

def clear_file(file):
    with open(file, 'w') as f:
        pass

def read_file(file):
    f = open(file, "r")
    file_line = f.readlines()

    return file_line

def write_file(file, message):
    with open(file, 'w') as f:
        f.write(message)    
    
    return f