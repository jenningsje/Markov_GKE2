#!/usr/bin/env python
import os, csv, json, requests, tempfile, io, sys
print("current working directory, need to import gemmi correctly in this file")
print(os.getcwd())
sys.path.append('..')
import gemmi
from gemmi import *
import urllib.parse

output_folder = 'app/mount/output/protein_coordinates.csv'
input_folder = 'app/mount/input/'

def search_pdb_by_protein_name(protein1):
    search_query = {
        "query": {
            "type": "terminal",
            "service": "full_text",
            "parameters": {
                "value": protein1
            }
        },
        "return_type": "entry"
    }

    search_url = "https://search.rcsb.org/rcsbsearch/v2/query?json=" + urllib.parse.quote(json.dumps(search_query))
    response = requests.get(search_url)

    if response.status_code == 200:
        print("staus code 200")
        try:
            search_results = response.json()
            print("fetching search results")
            if "result_set" in search_results:
                print("fetching the first result")
                result_set = search_results["result_set"]
                if result_set:
                    entry = result_set[0]  # Get the first result
                    pdb_id = entry["identifier"]
                    return pdb_id
                else:
                    print("No results found")
            else:
                print("Invalid response format")
        except json.JSONDecodeError as e:
            print("JSON decoding error:", str(e))
    else:
        print("Request failed with status code:", response.status_code)

def cifDownload(pdbID, destfile=None, extension=".pdb", URL=None, verbose=False):
    import urllib.request  # Add this import

    # If file name is not provided, use temp directory and filename
    if destfile is None:
        print("removing the file")
        tmpdir = tempfile.gettempdir()
        destfile = os.path.join(tmpdir, pdbID + extension)

    # If file is already there but has size 0, remove it and download again
    if os.path.exists(destfile) and os.path.getsize(destfile) == 0:
        os.remove(destfile)

    # If file is not there, download it
    if not os.path.exists(destfile):
        print("file does not exist")
        if verbose:
            print("Downloading file from the Internet")

        # if URL is not provided, use the RCSB
        if URL is None:
            print("defining URL variable")
            URL = f"https://files.rcsb.org/download/{pdbID}{extension}"

        # Download the file
        urllib.request.urlretrieve(URL, destfile)
    
    print(destfile)
    return destfile

def fetch_coordinates(file_path):
    """first stage of the pipeline: obtain the data"""
    # Extract the base name of the file_path (without extension)
    output_directory = os.path.dirname(output_folder)
    base_name = os.path.splitext(os.path.basename(output_folder))[0]
    header = ['atom', 'amino', 'aa no.', 'x', 'y', 'z', 'protein no.']
    csv_file_path = os.path.join(output_directory, f'{base_name}.csv')

    # Create a string buffer to store CSV data
    csv_buffer = io.StringIO()

    # Open a new CSV file in text mode
    with open(output_folder, 'w', newline='') as csvfile:
        writer = csv.writer(csv_buffer)


        # Write the header row
        writer.writerow(header)

        # loop throughout an entire directory? (check me)
        # read the crystallographic information file (uncompressing it on the fly)
        gemmi.read_structure(file_path, format=gemmi.CoorFormat.Detect)
        cif_file = cif.read(file_path, )
        cif_block = cif_file.sole_block()

        # first phase of the bioinformatics pipeline:

        # obtain the following x, y, z coordinates, aa names and atoms for the protein given in path
        table = cif_block.find(['_atom_site.type_symbol', '_atom_site.label_comp_id', '_atom_site.auth_seq_id',
                               '_atom_site.Cartn_x', '_atom_site.Cartn_y', '_atom_site.Cartn_z',
                               '_atom_site.pdbx_PDB_model_num'])

        # write each row in every cif file to the CSV buffer
        for row in table:
            writer.writerow(row)

    # Get the CSV data from the buffer and encode it as bytes
    csv_data = csv_buffer.getvalue().encode('utf-8')
    csv_file = open(csv_file_path, 'wb')
    csv_file.write(csv_data)
    print(type(csv_file))
    print(csv)
