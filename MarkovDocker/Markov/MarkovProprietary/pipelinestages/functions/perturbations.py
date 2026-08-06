import numpy as np

def Backbone_docking(acid_grp_lig_r, acid_grp_lig_dist, acid_rec_r):

	# retrieve the distance between the amino acid within the receptor from all the amino acids adjacent to a given amino acid within a ligand (including itself)
	lig_rec_amino_dist = np.linalg.norm(acid_grp_lig_r - acid_rec_r, axis=1)

# subtract this distance from the distances of all the amino acids closest to a given amino acid within a ligand (including itself).

	"""if the distance between the amino acid in the receptor and the amino acid in the ligand is less than one of the amino acids adjacent to the ligand (including itself) then that amino acid within the ligand is adjacent to that amino acid in the receptor"""

	dist_compare = acid_grp_lig_dist.subtract(lig_rec_amino_dist, axis=1)
	check_for_bond = dist_compare.loc[dist_compare > 0]
	bond_absent = check_for_bond.empty

	if not bond_absent:
		Hbb = -3.331e-19
	else:
		Hbb = 0

	return Hbb

def Sidechain_docking(acid_grp_lig_r, acid_grp_lig_dist, acid_rec_r, H, M):

	# retrieve the distance between the amino acid within the receptor from all the amino acids adjacent to a given amino acid within a ligand (including itself)
	lig_rec_amino_dist = np.linalg.norm(acid_grp_lig_r - acid_rec_r, axis=1)

	# subtract this distance from the distances of all the amino acids closest to a given amino acid within a ligand (including itself).
	"""if the distance between the amino acid in the receptor and the amino acid in the ligand is less than one of the amino acids adjacent to the ligand (including itself) then that amino acid within the ligand is adjacent to that amino acid in the receptor"""

	dist_compare = acid_grp_lig_dist.subtract(lig_rec_amino_dist, axis=1)
	check_for_bond = dist_compare.loc[dist_compare > 0]
	bond_absent = check_for_bond.empty

	if not bond_absent:
		Hsc = H * M * 3 / 16

	else:
		Hsc = 0

	return Hsc

def VdW_docking(atom_rec_r, atom_lig_r, Eplus, VeSqrd, Vplus):

# physical constants
	a0 = .529 # bohr radius
	e_elec = 1.60217663 * pow(10, -19) # electron charge
	elec_const = 6.5 * pow(e_elec, 2) * a0 # electrostatic constant

	# distance between an atom in the receptor and an atom in a ligand
	R = atom_lig_r - atom_rec_r

	# amino acids are in a Van der Waals interaction
	if abs(R) <= 6.0 and abs(R) >= 3.3:
		VdW = (Eplus + elec_const) * VeSqrd / pow(R, 6) * (3 / 16)

	# Van der waals forces overlapping with the hydrogen bonds
	elif abs(R) >= 3.0 and abs(R) <= 3.3:
		VdW = Vplus * (1 / 2) + elec_const * (VeSqrd / pow(R, 6)) * (1 / 2) * (3 / 16)

	# Van der waals forces are absent
	else:
		VdW = 0

	return VdW

def COLOUMB_docking(atom_rec_r, atom_lig_r, nuclei_V, Eplus, Vplus):

	# physical constants
	eV_to_joules = 1.60218e-19 # electron charge

	# distance between an atom in the receptor and an atom in a ligand
	R = atom_rec_r - atom_lig_r

	# electrostatic interaction present no overlap with Van der Waals forces
	if abs(R) <= 10.0 and abs(R) >= 5.0:
		Coloumb = (nuclei_V + Eplus) * (6 / (27 * 27 * 16)) * eV_to_joules

	# electrostatic interactions overlap with Van der Waals forces
	elif abs(R) <= 6.0 and abs(R) >= 5.0:
		Coloumb = Coloumb = (nuclei_V + Vplus) * (6 / (27 * 27 * 16)) * eV_to_joules

	# electrostatic interactions absent
	else:
		Coloumb = 0

	return Coloumb