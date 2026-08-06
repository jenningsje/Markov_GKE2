import numpy as np
import pandas as pd

# takes in a position for an amino acid as well as the positions of all the amino acids and finds the four amino acids that are closest to the amino acid
def nearest_residues(position_dict, position):
	position_df = pd.DataFrame.from_dict(position_dict, orient="index", columns=['X', 'Y', 'Z'])
	position_series = pd.Series(position, index=['X', 'Y', 'Z'])
	position_df['Norm'] = np.linalg.norm(position_df[['X', 'Y', 'Z']] - position_series, axis=1)
	amino_df_sorted = position_df.sort_values(by='Norm', ascending=False, na_position='first')
	amino_data_no_duplicates = amino_df_sorted.drop_duplicates()
	amino_cluster = amino_data_no_duplicates.head(7)
	return amino_cluster
