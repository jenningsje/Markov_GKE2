"""Micro Scoring Function
"""


from lightdock.structure.model import DockingModel
from lightdock.scoring.functions import ModelAdapter, ScoringFunction
import sys
import os
print("in micro")
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../MarkovProprietary/pipelinestages'))
sys.path.insert(0, parent_dir)
from micro import *
print("imported micro")

class MicroAdapter(ModelAdapter):
    """Adapts a given Complex to a DockingModel object suitable for this
    'Template' scoring function.
    """

    def _get_docking_model(self, molecule, restraints):
        """Builds a suitable docking model for this scoring function"""
        # In model_objects we can store any coordinates object (atoms, beans, etc.)
        model_objects = []
        for residue in molecule.residues:
            for rec_atom in residue.atoms:
                model_objects.append(rec_atom)
        try:
            return DockingModel(
                model_objects,
                molecule.copy_coordinates(),
                restraints,
                n_modes=molecule.n_modes.copy(),
            )
        except AttributeError:
            return DockingModel(model_objects, molecule.copy_coordinates(), restraints)


class MicroScoringFunction(ScoringFunction):
    """Implements the 'Template' scoring function"""

    def __init__(self, weight=1.0):
        super(MicroScoringFunction, self).__init__(weight)
    
    def __call__(self, receptor, receptor_coordinates, ligand, ligand_coordinates):
        print("running")
        Gibbs_Total = gibbs_micro(receptor, receptor_coordinates, ligand, ligand_coordinates)
        
        return Gibbs_Total


# Needed to dynamically load the scoring functions from command line
DefinedScoringFunction = MicroScoringFunction
DefinedModelAdapter = MicroAdapter