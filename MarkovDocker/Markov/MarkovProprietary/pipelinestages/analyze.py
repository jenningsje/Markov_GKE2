import math, io
import numpy as np
import pandas as pd
from make_tables.python.K_elec_dict import *
from make_tables.python.nuclei_dict import *
from make_tables.python.V_elec_sqrd import *
from make_tables.python.VdW_tables import *
from QM_Corrections import *
from make_tables.python.abb_convert import *
from fetch_from_mount import *
from classes.energies import *
from classes.energies import *
from functions.nearest_residues import *
from make_tables.python.abb_convert import *
from get_corr import *
from functions.count_mols import *

def analyze_data(csv, Temp_Celcius):

    table_file0 = open("./txt/cas9table.txt")
    lines0 = table_file0.readlines()
    table_file0.close()

    # import the cas9 amino acid sequence
    seq_file0 = open("./txt/aminosequence.txt")
    seq_string0 = seq_file0.read()
    seq_file0.close()

    # import items for the Hij matrix Below
    # import the hamiltonian chart
    table_file = open("./txt/HamiltonianChart.txt")
    lines = table_file.readlines()
    table_file.close()

    # import the amino acid list
    seq_file = open("./txt/list.txt")
    seq_string = seq_file.read()
    seq_file.close()
    
    df = pd.read_csv(csv, dtype={'atom': 'bytes', 'amino': 'bytes', 'aa no.': 'bytes', 'x': 'bytes', 'y': 'bytes', 'z': 'bytes', 'prot no.': 'bytes'})
    print(df)
    prot_byte_array = io.BytesIO()
    df.to_pickle(prot_byte_array)
    prot_byte_array.seek(0)
  
    amino_dict2= {}
    protein_array = df.to_numpy()
    coordinates = np.empty([len(protein_array)])
    amino_positions = np.empty([len(protein_array), 3])
    amino_dist = np.empty(len(protein_array))
    M = np.empty([21, 21])
    H = np.empty([21, 21])
    Hbb = np.empty([len(protein_array), len(protein_array)])
    Hsc = np.empty([len(protein_array), len(protein_array)])
    VdW = np.empty([len(protein_array), len(protein_array)])
    Coloumb = np.empty([len(protein_array), len(protein_array)])
    seq_index = np.empty([len(protein_array)], dtype='int')
    amino_position_dict = {}
    atom_position_dict = {}
    R = np.empty([len(protein_array)], dtype=np.float64)

    Gibbs_BB = 0
    Gibbs_SC = 0
    Gibbs_VDW = 0
    Gibbs_COLOUMB = 0
    m = 0
    b = 3.8 * pow(10, -10)
    joule_to_kcal_per_mol = 1.4393278 * pow(10, 20)

    """
        1 joule = 0.000239006 kcal
        1 mol = 6.02214076 * 10^23 entities
    """

    BB_count = 0
    SC_count = 0
    VDW_count = 0
    COLOUMB_count = 0
    
    print(len(protein_array))
    if len(protein_array) > 7000:
        Gibbs_Total = 0
        print("skip protein, Killed 9 risk is high")
        return Gibbs_Total
    else:
        print("safety check passed")

    for i in range(len(protein_array)):
        print(i)
        # define variables
        if protein_array[i][1] in Amino_tuple:
            acid = Amino_abb_map[protein_array[i][1]]
            seq_index[i] = acids0.index(acid)
        else:
            acid = 'X'
            seq_index[i] = 20
        x1 = float(protein_array[i][3])
        y1 = float(protein_array[i][4])
        z1 = float(protein_array[i][5])
        r1 = np.sqrt(x1**2 + y1**2 + z1**2)

        if i < int(len(protein_array) - 1):
            x1_next = float(protein_array[i + 1][3])
            y1_next = float(protein_array[i + 1][4])
            z1_next = float(protein_array[i + 1][5])
            r1_next = np.sqrt(x1_next**2 + y1_next**2 + z1_next**2)
        else:
            x1_next = 0
            y1_next = 0
            z1_next = 0
            r1_next = np.sqrt(x1_next**2 + y1_next**2 + z1_next**2)

        coordinates[i] = r1
        amino_no_1 = int(protein_array[i][2])

        # retrieve the positions of the amino acids
        # retrieve the positions of the amino acids
        atom_bad1 = protein_array[i][0]
        if len(atom_bad1) > 1:
            lower_last_character1 = atom_bad1[-1].lower()
            atom1 = atom_bad1[:-1] + lower_last_character1
        else:
            atom1 = atom_bad1

        # not on the last atom in the dataset
        if i + 1 < len(protein_array):
            next_amino_no_1 = int(protein_array[i + 1][2])
        # on the last atom in the dataset
        else:
            next_amino_no_1 = "not present"
            atom_position_dict[atom1 + str(i)] = np.array([x1, y1, z1])
        # the next atom corresponds to the same amino acid as the current atom in the dataset
        if amino_no_1 == next_amino_no_1:
            atom_position_dict[atom1 + str(i)] = np.array([x1, y1, z1])
        # if there is a contaminant present instead of an amino acid then you will want to ignore backbone-backbone and sidechain-sidechain interactions entirely as they do not apply, the position of the contaminant as well as the coordinates will still need to be obtained though
            amino_positions[i] == 0
        elif acid == 'X':
            atom_position_dict[atom1 + str(i)] =  np.array([x1, y1, z1])
            amino_position_array = np.array(list(atom_position_dict.values()), dtype=float)
            amino_positions[i] = np.mean(amino_position_array, axis=0)
            amino_position_dict[amino_no_1] = amino_positions[i]
            atom_position_dict = {}
            amino_positions[i] = 0
        # the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
        else:
            amino_position_array = np.array(list(atom_position_dict.values()), dtype=float)
            amino_positions[i] = np.mean(amino_position_array, axis=0)
            amino_position_dict[amino_no_1] = amino_positions[i]
            atom_position_dict = {}
            amino_dist[i] = np.sqrt(pow(amino_positions[i][0], 2) + pow(amino_positions[i][1], 2) + pow(amino_positions[i][2], 2))
            m = m + 1

    print(len(protein_array))
    N = int(len(protein_array))
    k_B = 0.00198720645251433327944 / N # joule_to_kcal_per_mol X k_B
    T = Temp_Celcius + 273.15
    Gibbs_pep = (3 / 2) * k_B * T * ((1 - N) * math.log(2 * math.pi * pow(b, 2) / 3) + math.log(N) + 1)

    for i in range(len(protein_array)):
        atom_bad1 = protein_array[i][0]
        if len(atom_bad1) > 1:
            lower_last_character1 = atom_bad1[-1].lower()
            atom1 = atom_bad1[:-1] + lower_last_character1
        else:
            atom1 = atom_bad1
        # define variables
        if protein_array[i][1] in Amino_tuple:
            acid1 = Amino_abb_map[protein_array[i][1]]
            seq_index[i] = acids0.index(acid1)
        else:
            acid1 = 'X'
        # not on the last atom in the dataset
        if i + 1 < len(protein_array):
            next_amino_no_1 = int(protein_array[i + 1][2])
        # on the last atom in the dataset
        else:
            next_amino_no_1 = "not present"

        if amino_no_1 == next_amino_no_1:
            absent = 1
            acid_cluster = pd.DataFrame()
        elif acid == 'X':
            acid_cluster = nearest_residues(amino_position_dict, amino_positions[i])
            absent = 0
        # the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
        else:
            acid_cluster = nearest_residues(amino_position_dict, amino_positions[i])
            absent = 0

        for j in range(len(protein_array)):
            # define variables
            x2 = protein_array[j][3]
            y2 = protein_array[j][4]
            z2 = protein_array[j][5]
            r2 = math.sqrt(float(x2)**2 + float(y2)**2 + float(z2)**2)
            amino_no_2 = int(protein_array[j][2])

            # retrieve the positions of the amino acids
            atom_bad2 = protein_array[j][0]
            R = r1 - r2
            if len(atom_bad2) > 1:
                lower_last_character2 = atom_bad2[-1].lower()
                atom2 = atom_bad2[:-1] + lower_last_character2
            else:
                atom2 = atom_bad2
                atom_pair = atom1 + atom2

            if protein_array[i][1] in Amino_tuple:
                acid2 = Amino_abb_map[protein_array[i][1]]
                seq_index[i] = acids0.index(acid2)
            else:
                acid2 = 'X'

            # retrieve the position of the amino acids
            if j + 1 < len(protein_array):
                next_amino_no_2 = int(protein_array[j + 1][2])
            if amino_no_2 == next_amino_no_2:
                amino_dict2[atom2 + str(i)] = r2
            if amino_no_2 == next_amino_no_2:
                amino_dict2[atom1 + str(i)] = r2
            else:
                amino_dict2 = {}

            # define Markov matrices for Sidechain Perturbation term
            M = acid_table0[seq_index[i]][seq_index[j]]
            H = E[seq_index[i]][seq_index[j]]
            
            # define terms for Van der Waals perturbation
            total_energy1 = orbital_dict[periodic_dict['C']]
            total_energy2 = orbital_dict[periodic_dict['N']]
            E1_plus_E2 = total_energy1 + total_energy2
            K1_plus_K2 = K_elec_dict['CN']
            V1_plus_V2 = total_energy1 + total_energy2 - K1_plus_K2
            VdW_V = V_elec_sqrd_dict['CN']
            try:
                nuclei_V = nuclei_dict[atom_pair]['func_r']['exchange']['vnn'][0]
            except:
                nuclei_V = 0
            
            # define energy terms here
            E1 = energy(R, amino_no_1, amino_no_2)
            BB_E = E1.Backbone_E(Hbb[i][j], acid_cluster.index.values, amino_no_1, amino_no_2)
            SC_E = E1.Sidechain_E(H, M, Hsc[i][j], acid_cluster.index.values, amino_no_1, amino_no_2)
            VDW_E = E1.VdW_E(VdW[i][j], E1_plus_E2, VdW_V, V1_plus_V2)
            COLOUMB_E = E1.Coloumb_E(Coloumb[i][j], E1_plus_E2, V1_plus_V2, nuclei_V)

            M1 = mol_count(R, amino_no_1, amino_no_2)
            BB_count1 = M1.Backbone_count(acid_cluster.index.values, amino_no_1, amino_no_2)
            SC_count1 = M1.Sidechain_count(acid_cluster.index.values, amino_no_1, amino_no_2)
            VDW_count1 = M1.VdW_count()
            COLOUMB_count1 = M1.Coloumb_count()

            # count the number of bonds
            BB_count = BB_count1 + BB_count
            VDW_count = VDW_count1 + VDW_count
            SC_count = SC_count1 + SC_count
            COLOUMB_count = COLOUMB_count1 + COLOUMB_count

            Gibbs_BB = BB_E + Gibbs_BB
            Gibbs_SC = SC_E + Gibbs_SC
            Gibbs_VDW = VDW_E + Gibbs_VDW
            Gibbs_COLOUMB = COLOUMB_E + Gibbs_COLOUMB
        
    Gibbs_BB = (Gibbs_BB * joule_to_kcal_per_mol) / (2 * BB_count)
    Gibbs_SC = (Gibbs_SC * joule_to_kcal_per_mol) / (2 * SC_count)
    Gibbs_VDW = (Gibbs_VDW * joule_to_kcal_per_mol) / (2 * VDW_count)
    Gibbs_COLOUMB = (Gibbs_COLOUMB * joule_to_kcal_per_mol) / (2 * COLOUMB_count)
    Total_Gibbs = Gibbs_pep + Gibbs_BB + Gibbs_SC + Gibbs_VDW + Gibbs_COLOUMB
    Total_Entropy = Total_Gibbs
    print("total energy")
    
    return Total_Entropy

# take in the names of the proteins
names = open("./app/mount/input/names.txt")
names_lines = names.readlines()
names.close()
names1 = names_lines[0]
names2 = names_lines[1]

Markov_energies = np.empty(len(protein_arr))

# solely used to test the Markov Engine for now will be deleted later
input = 1
print("1")
PDB_ID = search_pdb_by_protein_name(names1)
print("2")
fetch_coordinates(cifDownload(PDB_ID))
print("3")
analyze_data(output_folder, 25)

input = 1
print("1")
PDB_ID = search_pdb_by_protein_name(names2)
print("2")
fetch_coordinates(cifDownload(PDB_ID))
print("3")
analyze_data(output_folder, 25)