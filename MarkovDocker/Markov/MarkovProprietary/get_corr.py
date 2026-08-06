
import pandas as pd

# retrieve the gibbs free energy data
protein_table = pd.read_csv("1temp.csv")
gibbs_energies = pd.DataFrame()
gibbs_energies_bad = pd.DataFrame()

# retrieve the gibbs free energy, temperature as well as the names of the proteins
gibbs_energies_bad["gibbs"] = protein_table.iloc[:, 10]
gibbs_energies_bad["temperature"] = protein_table.iloc[:, 9]
gibbs_energies_bad["name"] = protein_table.iloc[:, 1]

# clean the gibbs free energy dataframe of the empty values for gibbs energies
gibbs_not_empty = gibbs_energies_bad["gibbs"] != '-'
gibbs_energies_bad = gibbs_energies_bad[gibbs_not_empty]

# clean the gibbs free energy dataframe for the empty values for the temperature
temperature_not_empty = gibbs_energies_bad["temperature"] != '-'
gibbs_energies = gibbs_energies_bad[temperature_not_empty]

# drop the duplicate data in order to retrieve the names of the proteins for which there is data
gibbs_no_duplicate_proteins = gibbs_energies.drop_duplicates(subset=["name"])

# fetch the names of the proteins
protein_names = gibbs_no_duplicate_proteins["name"]

# print a specific row of the protein_arr
protein_arr = protein_names.to_numpy()
print(protein_arr[3])
