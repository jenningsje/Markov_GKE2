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
from functions.perturbations import *
from functions.nearest_acids import *
from make_tables.python.abb_convert import *

def gibbs_docking(r_obj, r_coord, l_obj, l_coord):

	# integration wtih lightdock
	receptor_coordinates = r_coord.coordinates
	ligand_coordinates = l_coord.coordinates
	receptor_objects = r_obj.objects
	ligand_objects = l_obj.objects
 
	table_dirname0 = os.path.dirname(__file__)
	table_filename0 = os.path.join(table_dirname0,"pipelinestages/txt/cas9table.txt")
	table_file0 = open(table_filename0)
	lines0 = table_file0.readlines()
	table_file0.close()

	# import the cas9 amino acid sequence
	seq_file0 = open(__file__)
	seq_file0 = open(seq_file0, "pipelinestages/txt/aminosequence.txt")
	seq_string0 = seq_file0.read()
	seq_file0.close()

	# import items for the Hij matrix Below
	# import the hamiltonian chart
	table_dirname = os.path.dirname(__file__)
	table_filename = os.path.dirname(table_dirname, "pipelinestages/txt/HamiltonianChart.txt")
	table_file = open(table_filename)
	lines = table_file.readlines()
	table_file.close()

	# import the amino acid list
	seq_dirname = os.path.dirname(__file__)
	seq_dirname = os.path.dirname(table_dirname, "pipelinestages/txt/list.txt")
	seq_file = open(seq_dirname)
	seq_string = seq_file.readlines()
	seq_file.close()

	# define physical constants
	k_B = 1.380649 * pow(10, -23)
	T = 273.15
	a0 = .529 * pow(10, -11)
	e_elec = 1.60217663 * pow(10, -19)
	joule_to_kcal_per_mol = 0.000239006 * (6.02214076 * pow(10, 23))
	elec_const = 6.5 * pow(e_elec, 2) * a0

	"""define the variables for the ligand part of the scoring function"""
	lig_amino_dict1 = {}
	lig_amino_dict2= {}
	lig_dists_to_nums = {}
	lig_positions_to_nos = {}
	lig_coordinates = np.empty([len(ligand_coordinates)])
	lig_amino_positions = np.empty([len(ligand_coordinates), 3])
	lig_amino_dist = np.empty(len(ligand_coordinates))
	lig_peptide_bond_dist = np.empty(len(ligand_coordinates))
	lig_M = np.empty([21, 21])
	lig_H = np.empty([21, 21])
	lig_seq_index = np.empty([len(ligand_coordinates)], dtype='int')
	lig_amino_position_dict = {}
	lig_atom_position_dict = {}
	lig_R = np.empty([len(ligand_coordinates)], dtype=np.float64)

	"""define the variables for the receptor part of the scoring function"""
	rec_amino_dict1 = {}
	rec_amino_dict2= {}
	rec_positions_to_nos = {}
	rec_coordinates = np.empty([len(receptor_coordinates)])
	rec_amino_positions = np.empty([len(receptor_coordinates), 3])
	rec_amino_dist = np.empty(len(receptor_coordinates))
	rec_peptide_bond_dist = np.empty(len(receptor_coordinates))
	rec_M = np.empty([21, 21])
	rec_H = np.empty([21, 21])
	rec_seq_index = np.empty([len(receptor_coordinates)], dtype='int')
	rec_amino_position_dict = {}
	rec_atom_position_dict = {}
	rec_R = np.empty([len(receptor_coordinates)], dtype=np.float64)

	"""define the variables for the part of the scoring function shared by both the ligand and the receptor"""
	Gibbs_Hbb = np.empty([len(receptor_coordinates), len(ligand_coordinates)])
	Gibbs_Hsc = np.empty([len(receptor_coordinates), len(ligand_coordinates)])
	Gibbs_VdW = np.empty([len(receptor_coordinates), len(ligand_coordinates)])
	Gibbs_Coloumb = np.empty([len(receptor_coordinates), len(ligand_coordinates)])
	Gibbs_BB_array = np.empty((len(receptor_coordinates), len(ligand_coordinates)), dtype=np.dtype('U100'))
	Gibbs_SC_array = np.empty((len(receptor_coordinates), len(ligand_coordinates)), dtype=np.dtype('U100'))
	Gibbs_VDW_array = np.empty((len(receptor_coordinates), len(ligand_coordinates)), dtype=np)
	Gibbs_COLOUMB_array = np.empty((len(receptor_coordinates), len(ligand_coordinates)), dtype='str')

	"""Prepare the data for the ligand. This will be used to create the scoring function later on. Afterwards this scoring function is stored within a python file and imported by lightdock. The scoring function is an array of functions"""
	print("inside gibbs docking")
	print(vars(ligand_objects[1]))
	for i in range(len(ligand_coordinates)):
		if ligand_objects[i][1] in Amino_tuple:
			lig_acid = Amino_abb_map[ligand_objects[i][1]]
			lig_seq_index[i] = acids0.index(lig_acid)
		else:
			lig_acid = 'X'
			lig_seq_index[i] = 20
			lig_x1 = float(ligand_coordinates[i][0])
			lig_y1 = float(ligand_coordinates[i][1])
			lig_z1 = float(ligand_coordinates[i][2])
			lig_r1 = np.sqrt(lig_x1**2 + lig_y1**2 + lig_z1**2)

		if i < int(len(ligand_objects) - 1):
			lig_x1_next = float(ligand_coordinates[i + 1][0])
			lig_y1_next = float(ligand_coordinates[i + 1][1])
			lig_z1_next = float(ligand_coordinates[i + 1][2])
			lig_r1_next = np.sqrt(lig_x1_next**2 + lig_y1_next**2 + lig_z1_next**2)
		else:
			lig_x1_next = 0
			lig_y1_next = 0
			lig_z1_next = 0
			lig_r1_next = np.sqrt(rec_x1_next**2 + rec_y1_next**2 + rec_z1_next**2)

		lig_coordinates[i] = lig_r1
		lig_amino_no_1 = int(ligand_objects[i][2])

		# retrieve the positions of the amino acids
		lig_atom_bad1 = ligand_objects[i][0]
		if len(lig_atom_bad1) > 1:
			lig_lower_last_character1 = lig_atom_bad1[-1].lower()
			lig_atom1 = lig_atom_bad1[:-1] + lig_lower_last_character1
		else:
			lig_atom1 = lig_atom_bad1

		# not on the last atom in the dataset
		if i + 1 < len(ligand_coordinates):
			lig_next_amino_no_1 = int(lig_coordinates[i + 1][2])
		# on the last atom in the dataset
		else:
			lig_next_amino_no_1 = "not present"
			lig_atom_position_dict[lig_atom1 + str(i)] = np.array([lig_x1, lig_y1, lig_z1])
		# the next atom corresponds to the same amino acid as the current atom in the dataset
		if lig_amino_no_1 == lig_next_amino_no_1:
			lig_atom_position_dict[lig_atom1 + str(i)] = np.array([lig_x1, lig_y1, lig_z1])
			# if there is a contaminant present instead of an amino acid then you will want to ignore backbone-backbone and sidechain-sidechain interactions entirely as they do not apply, the position of the contaminant as well as the coordinates will still need to be obtained though
			lig_amino_positions[i] == 0
		elif lig_acid == 'X':
			lig_atom_position_dict[lig_atom1 + str(i)] =  np.array([lig_x1, lig_y1, lig_z1])
			lig_amino_position_array = np.array(list(lig_atom_position_dict.values()), dtype=float)
			lig_amino_positions[i] = np.mean(lig_amino_position_array, axis=0)
			lig_amino_position_dict[lig_amino_no_1] = lig_amino_positions[i]
			lig_atom_position_dict = {}
			lig_amino_positions[i] = 0
			# the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
		else:
			lig_amino_position_array = np.array(list(lig_atom_position_dict.values()), dtype=float)
			lig_amino_positions[i] = np.mean(lig_amino_position_array, axis=0)
			lig_amino_position_dict[lig_amino_no_1] = lig_amino_positions[i]
			lig_atom_position_dict = {}
			lig_amino_dist[i] = np.sqrt(pow(lig_amino_positions[i][0], 2) + pow(lig_amino_positions[i][1], 2) + pow(lig_amino_positions[i][2], 2))
			lig_amino_dist[i + 1] = np.sqrt(pow(lig_amino_positions[i][0], 2) + pow(lig_amino_positions[i][1], 2) + pow(lig_amino_positions[i][2], 2))
			m = m + 1

		if i < len(lig_coordinates) - 1:
			lig_peptide_bond_dist = lig_amino_dist[i + 1] - lig_amino_dist[i]
		else:
			lig_peptide_bond_dist = 0

		lig_positions_to_nos[lig_amino_positions[i]] = lig_amino_no_1

	"""Prepare the data for the receptor. This will be used to create the scoring function later on. Afterwards this scoring function is stored within a python file and imported by lightdock."""
	for i in range(len(receptor_coordinates)):
		# define variables
		if receptor_objects[i][1] in Amino_tuple:
			rec_acid = Amino_abb_map[receptor_objects[i][1]]
			rec_seq_index[i] = acids0.index(rec_acid)
		else:
			rec_acid = 'X'
			rec_seq_index[i] = 20
			rec_x1 = float(receptor_coordinates[i][3])
			rec_y1 = float(receptor_coordinates[i][4])
			rec_z1 = float(receptor_coordinates[i][5])
			rec_r1 = np.sqrt(rec_x1**2 + rec_y1**2 + rec_z1**2)

		if i < int(len(receptor_coordinates) - 1):
			rec_x1_next = float(receptor_coordinates[i + 1][3])
			rec_y1_next = float(receptor_coordinates[i + 1][4])
			rec_z1_next = float(receptor_coordinates[i + 1][5])
			rec_r1_next = np.sqrt(rec_x1_next**2 + rec_y1_next**2 + rec_z1_next**2)
		else:
			rec_x1_next = 0
			rec_y1_next = 0
			rec_z1_next = 0
			rec_r1_next = np.sqrt(rec_x1_next**2 + rec_y1_next**2 + rec_z1_next**2)

		rec_coordinates[i] = rec_r1_next
		rec_amino_no_1 = int(receptor_objects[i][2])

		# retrieve the positions of the amino acids
		rec_atom_bad1 = receptor_objects[i][0]
		if len(rec_atom_bad1) > 1:
			rec_lower_last_character1 = rec_atom_bad1[-1].lower()
			rec_atom1 = rec_atom_bad1[:-1] + rec_lower_last_character1
		else:
			rec_atom1 = rec_atom_bad1

		# not on the last atom in the dataset
		if i + 1 < len(receptor_coordinates):
			rec_next_amino_no_1 = int(receptor_coordinates[i + 1][2])
		# on the last atom in the dataset
		else:
			receptor_next_amino_no_1 = "not present"
			rec_atom_position_dict[rec_atom1 + str(i)] = np.array([rec_x1, rec_y1, rec_z1])
		# the next atom corresponds to the same amino acid as the current atom in the dataset
		if rec_amino_no_1 == rec_next_amino_no_1:
			rec_atom_position_dict[rec_atom1 + str(i)] = np.array([rec_x1, rec_y1, rec_z1])
			# if there is a contaminant present instead of an amino acid then you will want to ignore backbone-backbone and sidechain-sidechain interactions entirely as they do not apply, the position of the contaminant as well as the coordinates will still need to be obtained though
			rec_amino_positions[i] == 0
		elif rec_acid == 'X':
			rec_atom_position_dict[rec_atom1 + str(i)] =  np.array([rec_x1, rec_y1, rec_z1])
			rec_amino_position_array = np.array(list(rec_atom_position_dict.values()), dtype=float)
			rec_amino_positions[i] = np.mean(rec_amino_position_array, axis=0)
			rec_amino_position_dict[rec_amino_no_1] = rec_amino_positions[i]
			rec_atom_position_dict = {}
			rec_amino_positions[i] = 0
			# the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
		else:
			rec_amino_position_array = np.array(list(rec_atom_position_dict.values()), dtype=float)
			rec_amino_positions[i] = np.mean(rec_amino_position_array, axis=0)
			rec_amino_position_dict[rec_amino_no_1] = rec_amino_positions[i]
			rec_atom_position_dict = {}
			rec_amino_dist[i] = np.sqrt(pow(rec_amino_positions[i][0], 2) + pow(rec_amino_positions[i][1], 2) + pow(rec_amino_positions[i][2], 2))
			m = m + 1

		if i < len(receptor_coordinates) - 1:
			rec_peptide_bond_dist = rec_amino_dist[i + 1] - rec_amino_dist[i]
		else:
			rec_peptide_bond_dist = 0

		rec_positions_to_nos[rec_amino_positions[i]] = rec_amino_no_1

		for j in range(len(receptor_coordinates)):
			rec_atom_bad1 = receptor_objects[i][0]
			if len(rec_atom_bad1) > 1:
				rec_lower_last_character1 = rec_atom_bad1[-1].lower()
				rec_atom1 = rec_atom_bad1[:-1] + rec_lower_last_character1
			else:
				rec_atom1 = rec_atom_bad1

			# define variables
			if receptor_objects[i][1] in Amino_tuple:
				rec_acid1 = Amino_abb_map[receptor_objects[i][1]]
				rec_seq_index[i] = acids0.index(rec_acid1)

			else:
				rec_acid1 = 'X'

			# not on the last atom in the dataset
			if i + 1 < len(rec_coordinates):
				rec_next_amino_no_1 = int(receptor_objects[i + 1][2])

			# on the last atom in the dataset
			else:
				rec_next_amino_no_1 = "not present"

			if rec_amino_no_1 == receptor_next_amino_no_1:
				rec_absent = 1
				rec_acid_cluster = pd.DataFrame()
			elif rec_acid == 'X':
				rec_acid_cluster = nearest_acids(rec_amino_position_dict, rec_amino_positions[i], rec_positions_to_nos[rec_amino_positions[i]])
				rec_absent = 0

			# the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
			else:
				rec_acid_cluster = Nearest_acids(rec_amino_position_dict, rec_amino_positions[i])
				rec_absent = 0
			print(i)

		for j in range(len(ligand_coordinates)):
			lig_atom_bad1 = ligand_coordinates[j][0]
			if len(lig_atom_bad1) > 1:
				lig_lower_last_character1 = lig_atom_bad1[-1].lower()
				lig_atom1 = lig_atom_bad1[:-1] + lig_lower_last_character1
			else:
				lig_atom1 = lig_atom_bad1
			# define variables
			if ligand_objects[j][1] in Amino_tuple:
				lig_acid1 = Amino_abb_map[ligand_objects[j][1]]
				lig_seq_index[j] = acids0.index(lig_acid1)
			else:
				lig_acid1 = 'X'
			# not on the last atom in the dataset
			if i + 1 < len(ligand_coordinates):
				lig_next_amino_no_1 = int(ligand_objects[j + 1][2])
			# on the last atom in the dataset
			else:
				lig_next_amino_no_1 = "not present"

			if lig_amino_no_1 == lig_next_amino_no_1:
				lig_absent = 1
				lig_acid_cluster = pd.DataFrame()

			elif lig_acid == 'X':
				lig_acid_cluster = nearest_acids(lig_amino_position_dict, lig_amino_positions[j])
				lig_absent = 0
			# the next atom DOES NOT CORRESPOND to the same amino acid as the current atom
			else:
				lig_acid_cluster = nearest_acids(lig_amino_position_dict, lig_amino_positions[j], lig_positions_to_nos[lig_amino_positions[j]])
				lig_absent = 0

			"""Define the terms to be inserted into the  scoring function for Lightdock, this scoring function is proprietary but so long as it is a module that is imported by Lightdock outside of its repository this is perfectly legal according to copyright law"""

			# define Markov matrices for Sidechain Perturbation term
			M = acid_table0[rec_seq_index[i]][lig_seq_index[j]]
			H = E[rec_seq_index[i]][lig_seq_index[j]]

			# derive the distances of the amino acids from each other within the group of amino acids that are not in a peptide bond with a given amino acid
			amino_cluster_lig_dist = lig_amino_dist(lig_acid_cluster)

			# derive the position of the amino acids closest to a given amino acid (including itself) within a ligand

			# define the scoring function
			DF1 = docking_function(lig_acid_cluster.index.values, rec_amino_no_1, lig_amino_no_1)
			Gibbs_Hbb[i][j] = DF1.Backbone_docking(lig_acid_cluster, amino_cluster_lig_dist)
			Gibbs_Hsc[i][j] = DF1.Sidechain_docking(rec_amino_positions[i], amino_cluster_lig_dist)
			Gibbs_VdW[i][j] = DF1.VdW_docking(receptor_coordinates[i], ligand_coordinates[j])
			Gibbs_Coloumb[i][j] = DF1.COLOUMB_docking(receptor_coordinates[i], ligand_coordinates[j])
			Total_docking  = Gibbs_Hbb[i][j] + Gibbs_Hsc[i][j] + Gibbs_VdW[i][j] + Gibbs_Coloumb[i][j]

	return Total_docking
