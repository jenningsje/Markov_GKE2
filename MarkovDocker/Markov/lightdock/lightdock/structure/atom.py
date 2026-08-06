"""Module to package atom representation and operations"""

from lightdock.mathutil.cython.cutil import distance as cdistance
from lightdock.error.lightdock_errors import AtomError
import logging


class Atom(object):
    """Represents a chemical atom"""
    BACKBONE_ATOMS = ["CA", "C", "N", "O"]
    RECOGNIZED_ELEMENTS = ['AC', 'AL', 'AM', 'SB', 'AR', 'AS', 'AT', 'BA', 'BK', 'BE', 'BI', 'BH', 'B', 'BR', 'CD', 'CS', 'CA', 'CF', 'C', 'CE', 'CL', 'CR', 'CO', 'CN', 'CU', 'CM', 'DS', 'DB', 'DY', 'ES', 'ER', 'EU', 'FM', 'FL', 'F', 'FR', 'GD', 'GA', 'GE', 'AU', 'HF', 'HS', 'HE', 'HO', 'H', 'IN', 'I', 'IR', 'FE', 'KR', 'LA', 'LR', 'PB', 'LI', 'LV', 'LU', 'MG', 'MN', 'MT', 'MD', 'HG', 'MO', 'ND', 'NE', 'NP', 'NI', 'NB', 'N', 'NO', 'OS', 'O', 'PD', 'P', 'Pt', 'PU', 'PO', 'K', 'PR', 'PM', 'PA', 'RA', 'RN', 'RE', 'RH', 'RG', 'RB', 'RU', 'RF', 'SM', 'SC', 'SG', 'Se', 'SI', 'AG', 'NA', 'SR', 'S', 'TA', 'TC', 'TE', 'Tb', 'TL', 'TH', 'TM', 'SN', 'TI', 'W', 'Og', 'MC', 'Ts', 'NH', 'U', 'V', 'XE', 'YB', 'Y', 'ZN', 'ZR', 'X']
    MASSES = {'AC': 227.027, 'AL': 26.982, 'AM': 241.057, 'SB': 121.76, 'AR': 39.948, 'AS': 74.922, 'AT': 209.987, 'BA': 137.33, 'BK': 247.070, 'BE': 9.0122, 'BI': 208.98, 'BH': 272.138, 'B': 10.806, 'BR': 79.901, 'CD': 112.41, 'CS': 132.91, 'CA': 40.078, 'CF': 249.074, 'C': 12.009, 'Ce': 140.12, 'CL': 35.446, 'CR': 51.996, 'CO': 58.933, 'CN': 285.177, 'CU': 63.546, 'CM': 243.061, 'DS': 281.164, 'DB': 68.126, 'DY': 162.50, 'ES': 252.083, 'ER': 167.26, 'EU': 151.96, 'FM': 257.095, 'FL': 289.19, 'F': 18.998, 'FR': 223.019, 'GD': 157.25, 'GA': 69.723, 'GE': 72.630, 'AU': 196.97, 'HF': 178.49, 'HS': 270.134, 'HE': 4.0026, 'HO': 164.93, 'H': 1.0078, 'IN': 114.82, 'I': 126.90, 'IR': 192.22, 'FE': 55.845, 'KR': 83.798, 'LA': 138.91, 'LR': 26211, 'PB': 207.2, 'LI': 6.938, 'LV': 293.205, 'LU': 174.97, 'MG': 24.304, 'MN': 54.938, 'MT': 276.152, 'MD': 258.098, 'HG': 200.59, 'MO': 95.95, 'ND': 144.24, 'NE': 20.180, 'NP': 236.047, 'NI': 58.693, 'NB': 92.906, 'N': 14.006, 'NO': 259.101, 'OS': 190.23, 'O': 15.999, 'PD': 106.42, 'P': 30.974, 'PT': 195.08, 'PU': 238.05, 'PO ': 208.982, 'K': 39.098, 'PR': 140.91, 'PM': 144.913, 'PA': 231.04, 'RA': 223.019, 'RN': 210.991, 'RE': 186.21, 'RH': 102.91, 'RG': 280.165, 'RB': 85.468, 'RU': 101.07, 'RF': 267.122, 'SM': 150.36, 'SC': 44.956, 'SG': 271.134, 'SE': 78.979, 'Si': 28.084, 'AG': 107.87, 'NA': 22.990, 'SR': 87.62, 'S': 32.059, 'TA': 180.95, 'Tc': 96.906, 'TE': 127.60, 'TB': 158.93, 'Tl': 204.38, 'TH': 232.04, 'TM': 168.93, 'SN': 118.71, 'TI': 47.867, 'W': 183.84, 'OG': 294.213, 'MC': 288.193, 'Ts': 292.208, 'NH': 284.179, 'U': 238.03, 'V': 50.942, 'XE': 131.29, 'YB': 173.05, 'Y': 88.906, 'ZN': 65.38, 'ZR': 91.224, 'X': 0.0}

    def __init__(
        self,
        atom_number=99999,
        atom_name="H",
        atom_alternative="",
        chain_id="",
        residue_name="",
        residue_number=9999,
        residue_insertion="",
        x=0.0,
        y=0.0,
        z=0.0,
        occupancy=1.0,
        b_factor=0.0,
        element=None,
        mass=None,
        atom_index=0,
    ):
        """Creates a new atom.

        Mass will be selected depending upon atom element. By default, creates a
        regular hydrogen atom. Index can be used to quickly identify an atom or to use it
        as an index in an external data structure, i.e., a coordinates matrix.
        """
        self.number = atom_number
        self.name = atom_name
        self.alternative = atom_alternative
        self.chain_id = chain_id
        self.residue_name = residue_name
        self.residue_number = residue_number
        self.residue_insertion = residue_insertion.strip()
        self.x = x
        self.y = y
        self.z = z
        self.occupancy = occupancy
        self.b_factor = b_factor
        if element:
            try:
                if element not in Atom.RECOGNIZED_ELEMENTS:
                    # if data is corrupt ignore it
                    atom_element = 'X'
                    self.element = atom_element
                    logging.info(f"Not recognized element {atom_element} for atom {self.name}. setting element to {atom_element}")
                self.element = element
            except AtomError:
                self._assign_element()
        else:
            self._assign_element()
        if mass:
            self.mass = mass
        # data is clean
        elif element in Atom.RECOGNIZED_ELEMENTS:
            self.mass = Atom.MASSES[self.element]
        # data is corrupt
        else:
            # ignore corrupt data replace corrupt data with empty placeholder
            atom_element = 'X'
            self.element = atom_element
            # mass for placeholder is zero since the corrupt data is ignored
            self.mass = Atom.MASSES[self.element]
        self.index = atom_index

    def _assign_element(self):
        """Assigns an element to an atom depending on its name"""
        atom_element = self.name[:2]
        if atom_element in Atom.RECOGNIZED_ELEMENTS:
            self.element = atom_element
        else:
            atom_element = self.name[0]
            if atom_element in Atom.RECOGNIZED_ELEMENTS:
                self.element = atom_element
            else:
                atom_element = 'X'
                self.element = atom_element
                logging.info(f"Not recognized element {atom_element} for atom {self.name}. setting element to {atom_element}")

    def distance(self, other):
        return cdistance(self.x, self.y, self.z, other.x, other.y, other.z)

    def is_hydrogen(self):
        """Checks if this atom is of hydrogen type"""
        return self.element == "H"

    def is_backbone(self):
        """Checks if this atom belongs to the residue backbone"""
        return self.name in Atom.BACKBONE_ATOMS

    def get_coordinates(self):
        """Gets the coordinates vector"""
        return [self.x, self.y, self.z]

    def clone(self):
        """Creates a copy of the current atom"""
        return Atom(
            self.number,
            self.name,
            self.alternative,
            self.chain_id,
            self.residue_name,
            self.residue_number,
            self.residue_insertion,
            self.x,
            self.y,
            self.z,
            self.occupancy,
            self.b_factor,
            self.element,
            self.mass,
            self.index,
        )

    def __eq__(self, other):
        """Compares two atoms for equality.

        Compare by number should be enough, but pdb files usually contain errors
        or numeration can be affected by chain id.
        """
        return (
            self.number == other.number
            and self.name == other.name
            and self.chain_id == other.chain_id
        )

    def __ne__(self, other):
        """Compares two atoms for unequality"""
        return not self.__eq__(other)

    def __str__(self):
        return "%4s%8.3f%8.3f%8.3f" % (self.name, self.x, self.y, self.z)


class HetAtom(Atom):
    """Represents an heterogeneous atom"""

    def __init__(
        self,
        atom_number=99999,
        atom_name="H",
        atom_alternative="",
        chain_id="",
        residue_name=None,
        residue_number=9999,
        residue_insertion="",
        x=0.0,
        y=0.0,
        z=0.0,
        occupancy=1.0,
        b_factor=0.0,
        element=None,
        mass=None,
        atom_index=0,
    ):
        """Creates a new hetatom"""
        super(HetAtom, self).__init__(
            atom_number,
            atom_name,
            atom_alternative,
            chain_id,
            residue_name,
            residue_number,
            residue_insertion,
            x,
            y,
            z,
            occupancy,
            b_factor,
            element,
            mass,
            atom_index,
        )