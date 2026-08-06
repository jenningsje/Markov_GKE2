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

with open('../MarkovProprietary/pipelinestages/make_tables/json/nuclei_dict.json', 'r') as file:
    data = json.load(file)

def gibbs_micro(r_obj, r_coord, l_obj, l_coord):

    # integration with lightdock
    receptor_coordinates = r_coord.coordinates
    ligand_coordinates = l_coord.coordinates
    receptor_objects = r_obj.objects
    ligand_objects = l_obj.objects

    # physical constants
    a0 = .529 # bohr radius
    e_elec = 1.60217663 * pow(10, -19) # electron charge
    elec_const = 6.5 * pow(e_elec, 2) * a0 # electrostatic constant
    eV_to_joules = 1.60218e-19 # electron charge

    """define the variables for the part of the scoring function shared by both the ligand and the receptor"""
    Gibbs_VdW = np.empty([len(receptor_coordinates), len(ligand_coordinates)])
    Gibbs_Coloumb = np.empty([len(receptor_coordinates), len(ligand_coordinates)])

    # define terms for Van der Waals perturbation
    total_energy1 = orbital_dict[periodic_dict['C']]
    total_energy2 = orbital_dict[periodic_dict['N']]
    E1_plus_E2 = total_energy1 + total_energy2
    K1_plus_K2 = K_elec_dict['CN']
    V1_plus_V2 = total_energy1 + total_energy2 - K1_plus_K2
    VdW_V = V_elec_sqrd_dict['CN']

    # array for the coordinates and the names of the atoms for the receptor and ligand
    r_rec = np.empty(len(receptor_coordinates), dtype=float)
    r_lig = np.empty(len(ligand_coordinates), dtype=float)
    r_atom = np.empty(len(receptor_objects), dtype=str)
    l_atom = np.empty(len(ligand_objects), dtype=str)

    for i, rec_obj in enumerate(receptor_objects):
        # retrieve the coordinates of the atom in the receptor
        r_rec[i] = np.sqrt(pow(rec_obj.x, 2) + pow(rec_obj.y, 2) + pow(rec_obj.z, 2))
        # retrieve the name of the atom in the receptor
        r_atom[i] = rec_obj.name
        for j, lig_obj in enumerate(ligand_objects):
            # retrieve the coordinates of the atom in the receptor
            r_lig[j] = np.sqrt(pow(lig_obj.x, 2) + pow(lig_obj.y, 2) + pow(lig_obj.z, 2))
            # retrieve the name of the atom in the receptor
            l_atom[j] = lig_obj.name
            atom_pair = r_atom[i] + l_atom[j]
            # retrieve the nuclei interaction potential energy for the coloumb interaction
            try:
                nuclei_V = nuclei_dict[atom_pair]['func_r']['exchange']['vnn'][0]
            except:
                nuclei_V = 0

            # distance between an atom in the receptor and an atom in a ligand
            R = abs(r_rec[i] - r_lig[j])

            # amino acids are in a Van der Waals interaction
            if abs(R) <= 6.0 and abs(R) >= 3.3:
                Gibbs_VdW = (E1_plus_E2 + elec_const) * VdW_V / pow(R, 6) * (3 / 16)

            # Van der waals forces overlapping with the hydrogen bonds
            elif abs(R) >= 3.0 and abs(R) <= 3.3:
                Gibbs_VdW = V1_plus_V2 * (1 / 2) + elec_const * (VdW_V / pow(R, 6)) * (1 / 2) * (3 / 16)

            # Van der waals forces are absent
            else:
                Gibbs_VdW = 0

            # electrostatic interaction present no overlap with Van der Waals forces
            if abs(R) <= 10.0 and abs(R) >= 5.0:
                Gibbs_Coloumb = (nuclei_V + E1_plus_E2) * (6 / (27 * 27 * 16)) * eV_to_joules

            # electrostatic interactions overlap with Van der Waals forces
            elif abs(R) <= 6.0 and abs(R) >= 5.0:
                Gibbs_Coloumb = (nuclei_V + V1_plus_V2) * (6 / (27 * 27 * 16)) * eV_to_joules

            # electrostatic interactions absent
            else:
                Gibbs_Coloumb = 0

    Total_docking = np.sum(Gibbs_VdW) + np.sum(Gibbs_Coloumb)

    return Total_docking
