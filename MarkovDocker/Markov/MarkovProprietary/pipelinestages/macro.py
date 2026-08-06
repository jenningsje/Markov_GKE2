import numpy as np
import json
from make_tables.python.K_elec_dict import *
from make_tables.python.V_elec_sqrd import *
from make_tables.python.VdW_tables import *
from make_tables.python.abb_convert import *
from make_tables.python.abb_convert import *
from QM_Corrections import *
from fetch_from_mount import *
from functions.perturbations import *
from functions.nearest_residues import *

print("need to import in this directory in macro.py: " + os.getcwd())

with open('../MarkovProprietary/pipelinestages/make_tables/json/nuclei_dict.json', 'r') as file:
    data = json.load(file)

def gibbs_macro(r_obj, r_coord, l_obj, l_coord):

    # integration with lightdock
    r_coord = r_coord.coordinates
    l_coord = l_coord.coordinates
    r_obj = r_obj.objects
    l_obj = l_obj.objects

    # physical constants
    a0 = .529 # bohr radius
    e_elec = 1.60217663 * pow(10, -19) # electron charge
    elec_const = 6.5 * pow(e_elec, 2) * a0 # electrostatic constant
    eV_to_joules = 1.60218e-19 # electron charge

    """define the variables for the part of the scoring function shared by both the ligand and the receptor"""
    Gibbs_Hbb = np.empty([len(r_coord), len(l_coord)])
    Gibbs_Hsc = np.empty([len(r_coord), len(l_coord)])

    # array for the coordinates and the names of the residues for the receptor and ligand
    pos_rec = np.empty(len(r_coord), dtype=float)
    pos_lig = np.empty(len(l_coord), dtype=float)
    r_residue = np.empty(len(r_obj), dtype=str)
    l_residue = np.empty(len(l_obj), dtype=str)

    # array for the coordinates and names of the residues for the receptor and ligand
    r_seq_index = np.empty([len(r_coord)], dtype='int')
    l_seq_index = np.empty([len(l_coord)], dtype='int')
    amino_position_dict = {}

    for i, r_rec in enumerate(r_coord):

        pos_rec[i] = np.sqrt(pow(r_rec[0], 2) + pow(r_rec[1], 2) + pow(r_rec[2], 2))

        if r_obj[i].name in Amino_tuple:
            r_res = Amino_abb_map[r_obj[i].name]
            r_seq_index[i] = acids0.index(r_res)
        else:
            r_res = 'X'
            r_seq_index[i] = 20

        for j, r_lig in enumerate(l_coord):

            pos_lig[j] = np.sqrt(pow(r_lig[0], 2) + pow(r_lig[1], 2) + pow(r_lig[2], 2))

            if l_obj[j].name in Amino_tuple:
                l_res = Amino_abb_map[l_obj[j].name]
                l_seq_index[j] = acids0.index(l_res)
            else:
                l_res = 'X'
                l_seq_index[j] = 20

            M = acid_table0[r_seq_index[i]][l_seq_index[j]]
            H = E[r_seq_index[i]][l_seq_index[j]]

            R = abs(pos_rec[i] - pos_lig[j])

            if R < 3.5:
                Gibbs_Hbb[i][j] = -3.331e-19
                Gibbs_Hsc[i][j] = H * M * 3 / 16
            else:
                Gibbs_Hbb[i][j] = 0.0
                Gibbs_Hsc[i][j] = 0.0

    Gibbs_Total = np.sum(Gibbs_Hbb) + np.sum(Gibbs_Hsc)

    return Gibbs_Total