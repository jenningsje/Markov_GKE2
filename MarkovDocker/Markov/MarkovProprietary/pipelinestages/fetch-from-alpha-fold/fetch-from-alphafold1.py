import urllib
import urllib.parse
import urllib.request
from bs4 import BeautifulSoup
def get_uniprot (query='',query_type='PDB_ID'):
    #code found at <a href="https://chem-workflows.com/articles/2019/10/29/retrieve-uniprot-data-using-python/">https://chem-workflows.com/articles/2019/10/29/retrieve-uniprot-data-using-python/</a>
    #query_type must be: "PDB_ID" or "ACC"
    url = 'https://www.uniprot.org/uploadlists/' #This is the webser to retrieve the Uniprot data
    params = {
    'from':query_type,
    'to':'ACC',
    'format':'txt',
    'query':query
    }
    data = urllib.parse.urlencode(params)
    data = data.encode('ascii')
    request = urllib.request.Request(url, data)
    with urllib.request.urlopen(request) as response:
        res = response.read()
        page = BeautifulSoup(res, 'lxml').get_text()
        page=page.splitlines()
    return page
pdb_code = '4FXF'
query_output=get_uniprot(query=pdb_code,query_type='PDB_ID')
accession_number = query_output
