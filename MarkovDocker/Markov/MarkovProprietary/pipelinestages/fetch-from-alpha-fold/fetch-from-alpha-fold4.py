import os
alphafold_ID = 'AF-P14618-F1'
database_version = v2
model_url = f'https://alphafold.ebi.ac.uk/files/{alphafold_ID}-model_{database_version}.pdb
error_url = f'https://alphafold.ebi.ac.uk/files/{alphafold_ID}-predicted_aligned_error_{database_version}.json'
os.system(f'curl {model_url} -o {alphafold_id}.pdb')
os.system(f'curl {error_url} -o {alphafold_id}.json')