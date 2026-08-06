"""Macro Scoring Function
"""

import os
from lightdock.error.lightdock_errors import PotentialsParsingError
from lightdock.structure.model import DockingModel
from lightdock.structure.space import SpacePoints
from lightdock.scoring.functions import ModelAdapter, ScoringFunction
import sys
print("in macro")
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../MarkovProprietary/pipelinestages'))
sys.path.insert(0, parent_dir)
from macro import *
print("imported macro")

class MJPotential(object):
    """Loads MJ potentials information"""

    residues = {
        "LEU": 0,
        "PHE": 1,
        "ILE": 2,
        "MET": 3,
        "VAL": 4,
        "TRP": 5,
        "CYS": 6,
        "TYR": 7,
        "HIS": 8,
        "ALA": 9,
        "THR": 10,
        "GLY": 11,
        "PRO": 12,
        "ARG": 13,
        "GLN": 14,
        "SER": 15,
        "ASN": 16,
        "GLU": 17,
        "ASP": 18,
        "LYS": 19,
    }

    def __init__(self, data_file="MJ_potentials.dat"):
        data_path = os.path.dirname(os.path.realpath(__file__)) + "/data/"
        self.potentials = MJPotential._read_potentials(data_path + data_file)

    @staticmethod
    def _read_potentials(data_file_name):
        """Reads a given potentials file.

        Identifies each potential matrix by '>' and '<'
        """
        data_file = open(data_file_name)
        data = data_file.readlines()
        data_file.close()
        potentials = {}

        try:
            current_potential = ""
            for line in data:
                line = line.rstrip()
                if line:
                    if line[0] == "<":
                        current_potential = ""

                    if current_potential:
                        potentials[current_potential].append(
                            [float(x) for x in line.split()]
                        )

                    if line[0] == ">":
                        current_potential = line[1:]
                        potentials[current_potential] = []

        except Exception as e:
            raise PotentialsParsingError(
                "Error parsing %s file. Details: %s" % (data_file_name, str(e))
            )

        return potentials


class MacroAdapter(ModelAdapter):
    """Adapts a given Complex to a DockingModel object suitable for this
    MJ3h scoring function.
    """
    
    residues = {
        "LEU": 0,
        "PHE": 1,
        "ILE": 2,
        "MET": 3,
        "VAL": 4,
        "TRP": 5,
        "CYS": 6,
        "TYR": 7,
        "HIS": 8,
        "ALA": 9,
        "THR": 10,
        "GLY": 11,
        "PRO": 12,
        "ARG": 13,
        "GLN": 14,
        "SER": 15,
        "ASN": 16,
        "GLU": 17,
        "ASP": 18,
        "LYS": 19,
    }

    def _get_docking_model(self, molecule, restraints):
        """Builds a suitable docking model for this scoring function"""
        list_of_coordinates = []
        not_considered_atoms = ["O", "C", "N", "H"]
        residues_to_remove = []
        residues = [residue for chain in molecule.chains for residue in chain.residues]
        parsed_restraints = {}
        for structure in range(molecule.num_structures):
            coordinates = []
            for res_index, residue in enumerate(residues):
                print(residue)
                c_x = 0.0
                c_y = 0.0
                c_z = 0.0
                count = 0
                chain_id = ""
                for atom in residue.atoms:
                    if atom.name not in not_considered_atoms:
                        c_x += molecule.atom_coordinates[structure][atom.index][0]
                        c_y += molecule.atom_coordinates[structure][atom.index][1]
                        c_z += molecule.atom_coordinates[structure][atom.index][2]
                        count += 1
                        chain_id = atom.chain_id
                if count:
                    count = float(count)
                    coordinates.append([c_x / count, c_y / count, c_z / count])
                    res_id = (
                        f"{chain_id}.{residue.name}.{residue.number}{residue.insertion}"
                    )
                    if restraints and res_id in restraints:
                        parsed_restraints[res_id] = []
                else:
                    residues_to_remove.append(res_index)

            if len(residues_to_remove):
                residues = [
                    residue
                    for res_index, residue in enumerate(residues)
                    if res_index not in residues_to_remove
                ]

            list_of_coordinates.append(SpacePoints(coordinates))

        return DockingModel(residues, list_of_coordinates, parsed_restraints)


class MacroScoringFunction(ScoringFunction):
    """Implements the 'Template' scoring function"""

    def __init__(self, weight=1.0):
        super(MacroScoringFunction, self).__init__(weight)
    
    def __call__(self, receptor, receptor_coordinates, ligand, ligand_coordinates):
        print("running")
        Gibbs_Total = gibbs_macro(receptor, receptor_coordinates, ligand, ligand_coordinates)
        
        return Gibbs_Total

# Needed to dynamically load the scoring functions from command line
DefinedScoringFunction = MacroScoringFunction
DefinedModelAdapter = MacroAdapter