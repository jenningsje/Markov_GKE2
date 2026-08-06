# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
import numpy as np
"""This computational model is used to compute the entropic contributions
due to the bond breaking that results in quantum mechanical effects.
These effects result in a change within the function of a protein overall.

This model results in an increase in the conformational entropy by 0.7%
for backbone-backbone interactions and 10% for sidechain-sidechain interactions.
The temperature used within this model is 273.15 K

This model ignores bond breaking due to tunneling effects. For a computational
model that accounts for bond breaking due to tunneling see Tunneling-Corrections."""

# import items for the Mij matrix Below
# import the acid table
cas9_var = "../MarkovProprietary/pipelinestages/txt/cas9table.txt"
table_file0 = open(cas9_var)
lines0 = table_file0.readlines()
table_file0.close()

# import the cas9 amino acid sequence
aminosequence_var = "../MarkovProprietary/pipelinestages/txt/aminosequence.txt"
seq_file0 = open(aminosequence_var)
seq_string0 = seq_file0.read()
seq_file0.close()

# import items for the Hij matrix Below
# import the hamiltonian chart
HamiltonianChart_var = "../MarkovProprietary/pipelinestages/txt/HamiltonianChart.txt"
table_file = open(HamiltonianChart_var)
lines = table_file.readlines()
table_file.close()

# import the amino acid list
list_var = "../MarkovProprietary/pipelinestages/txt/list.txt"
seq_file = open(list_var)
seq_string = seq_file.read()
seq_file.close()

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# print items for the Mij matrix below
# print out the list of amino acids
acids0 = lines0[0].split()

# print out the cas9 amino acid sequence

seq_list0 = seq_string0.split()

# print items for the Hij matrix Below
# print out the list of amino acids
seq_list = seq_string.split()

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# parameters for the Hij matrix below
n = len(seq_list)
seq_index = []

# parameters for the Mij matrix below
m = len(seq_list0)
seq_index0 = []

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# matrices corresponding to the Mij matrix below
# hydrogen bond probability matrix
acid_table0 = []

# Mij matrix below
M = np.empty([m, m])

# matrices corresponding to the Hij matrix below
# matrix for the types of hydrogen bonds
hamiltonian_table = []

# matrix for the energy levels
E = np.empty([n, n])

# hamiltonian matrix
H = np.empty([m, m])

# tensor product for acid_table0 and Eij
A = np.empty([n, n])

# tensor product for Mij and Kij
D = np.empty([m, m])

# Energy corresponding to the sidechains
Hsc = np.empty([m, m])

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# construct the hydrogen bond probability matrix
for line0 in lines0[1:]:
    
    row0 = line0.split()[1:]
    numbers0 = list(map(float,row0))
    acid_table0.append(numbers0)

for item0 in seq_list0:
    seq_index0.append(acids0.index(item0))

# construct the matrix for the types of hydrogen bonds
for line in lines[1:]:
    
    row = line.split()[1:]
    letters = list(map(str,row))
    hamiltonian_table.append(letters)

# construct the matrix for the energy levels
for i in range(n):
    for j in range(n):
        prob = hamiltonian_table[i][j]
        if prob == "N":
            E[i][j] = -5.23142e-19
        elif prob == "O":
            E[i][j] = -6.66101e-19
        elif prob == "P":
            E[i][j] = -0.488758125e-19
        else:
            E[i][j] = 0.0
