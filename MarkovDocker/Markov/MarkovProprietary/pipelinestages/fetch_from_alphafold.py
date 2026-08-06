import os, tempfile, requests, re
from requests.adapters import HTTPAdapter, Retry
from fetch_from_mount import *

re_next_link = re.compile(r'<(.+)>; rel="next"')
retries = Retry(total=5, backoff_factor=0.25, status_forcelist=[500, 502, 503, 504])
session = requests.Session()
session.mount("https://", HTTPAdapter(max_retries=retries))

def Alpha_Fold_Download(alphafold_ID, database_version="v2", destfile=None, extension=".pdb", URL=None, verbose=False):
    import urllib.request  # Add this import

    # If file name is not provided, use temp directory and filename
    if destfile is None:
        tmpdir = tempfile.gettempdir()
        destfile = os.path.join(tmpdir, alphafold_ID + extension)

    # If file is already there but has size 0, remove it and download again
    if os.path.exists(destfile) and os.path.getsize(destfile) == 0:
        os.remove(destfile)

    # If file is not there, download it
    if not os.path.exists(destfile):
        if verbose:
            print("Downloading file from the Internet")

        # if URL is not provided, use the RCSB
        if URL is None:
            URL = f"https://alphafold.ebi.ac.uk/files/{alphafold_ID}-model_{database_version}.pdb"

        # Download the file
        urllib.request.urlretrieve(URL, destfile)

    return destfile

def get_next_link(headers):
    if "Link" in headers:
        match = re_next_link.match(headers["Link"])
        if match:
            return match.group(1)

def get_batch(batch_url):
    while batch_url:
        response = session.get(batch_url)
        response.raise_for_status()
        total = response.headers["x-total-results"]
        yield response, total
        batch_url = get_next_link(response.headers)

def get_accession(protein):

    url = url = 'https://rest.uniprot.org/uniprotkb/search?fields=accession%2Ccc_interaction&format=tsv&query=' + f'{protein}' '%20AND%20%28reviewed%3Atrue%29&size=500'
    primaryAccessions = []
    for batch, total in get_batch(url):
        for line in batch.text.splitlines()[1:]:
            primaryAccession, interactsWith = line.split('\t')
            primaryAccessions.append(primaryAccession)

    return primaryAccessions[0]

def get_AlphaFold_id(accession_id):
    url = "https://alphafold.ebi.ac.uk/api/prediction/" + f'{accession_id}'
    response = requests.get(url)
    json = response.json()
    entryId = json[0]['entryId']
    return entryId

def get_AlphaFold_data(user_entry):
    accession_id = get_accession(user_entry)
    AlphaFold_id = get_AlphaFold_id(accession_id)
    dest_file = Alpha_Fold_Download(AlphaFold_id)

    return dest_file