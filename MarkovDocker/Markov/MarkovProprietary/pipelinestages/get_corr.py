import pandas as pd

# retrieve the gibbs free energy data
protein_table = pd.read_csv("1temp.csv")
gibbs_energies = pd.DataFrame()
gibbs_energies_bad = pd.DataFrame()

# retrieve the gibbs free energy, temperature as well as the names of the proteins
gibbs_energies_bad["gibbs"] = protein_table.iloc[:, 11]
gibbs_energies_bad["temperature"] = protein_table.iloc[:, 10]
gibbs_energies_bad["name"] = protein_table.iloc[:, 1]

# clean the gibbs free energy dataframe of the empty values for gibbs energies
gibbs_not_empty = gibbs_energies_bad["gibbs"] != '-'
gibbs_energies_bad = gibbs_energies_bad[gibbs_not_empty]

# clean the gibbs free energy dataframe for the empty values for the temperature
temperature_not_empty = gibbs_energies_bad["temperature"] != '-'
gibbs_energies_bad1 = gibbs_energies_bad[temperature_not_empty]

# fetch the names of the proteins
protein_names = gibbs_energies_bad1["name"]

# convert to numpy array
protein_arr = protein_names.to_numpy()

# convert from str to float
gibbs_energies["gibbs"] = gibbs_energies_bad1["gibbs"].astype(float)
gibbs_energies["temperature"] = gibbs_energies_bad1["temperature"].astype(float)
gibbs_energies["name"] = gibbs_energies_bad1["name"]

# fetch the entropy values
empirical_energies = gibbs_energies["gibbs"].to_numpy()
empirical_temperatures = gibbs_energies["temperature"].to_numpy()

# inspect data
empirical_csv = gibbs_energies.to_csv("empirical_data.csv")
empirical_df = pd.read_csv("empirical_data.csv")
empirical_array = empirical_df.to_numpy()
print(empirical_array)
