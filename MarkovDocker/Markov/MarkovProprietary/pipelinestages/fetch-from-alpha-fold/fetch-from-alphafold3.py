accession_contents = open('accession_ids.txt', 'r').readlines()
accession_dict = {}
for i in accession_contents:
    accession_dict[i.split(',')[0]] = i.split(',')[3]
accession_id = 'P14618'
alphafold_id = None
if accession_id in accession_dict:
    alphafold_id = accession_dict[accession_id]