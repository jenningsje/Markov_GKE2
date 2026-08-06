def get_uniprot_sequences(uniprot_ids: List) -> pd.DataFrame:
        """
        Retrieve uniprot sequences based on a list of uniprot sequence identifier.

        For large lists it is recommended to perform batch retrieval.

        documentation which columns are available:
        https://www.uniprot.org/help/uniprotkb%5Fcolumn%5Fnames

        this python script is based on
        https://www.biostars.org/p/67822/

        Parameters:
            uniprot_ids: List, list of uniprot identifier

        Returns:
            pd.DataFrame, pandas dataframe with uniprot id column and sequence
        """
        import urllib
        url = 'https://www.uniprot.org/uploadlists/'  # This is the webserver to retrieve the Uniprot data
        params = {
            'from': "ACC",
            'to': 'ACC',
            'format': 'tab',
            'query': " ".join(uniprot_ids),
            'columns': 'id,sequence'}

        data = urllib.parse.urlencode(params)
        data = data.encode('ascii')
        request = urllib.request.Request(url, data)
        with urllib.request.urlopen(request) as response:
            res = response.read()
        df_fasta = pd.read_csv(StringIO(res.decode("utf-8")), sep="\t")
        df_fasta.columns = ["Entry", "Sequence", "Query"]
        # it might happen that 2 different ids for a single query id are returned, split these rows
        return df_fasta.assign(Query=df_fasta['Query'].str.split(',')).explode('Query')