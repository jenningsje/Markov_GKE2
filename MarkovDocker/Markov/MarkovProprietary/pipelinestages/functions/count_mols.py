class mol_count:

    def __init__(self, R, no1, no2):
        self.R = R
        self.no1 = no1
        self.no2 = no2

    # backbone-backbone bonding energy
    def Backbone_count(self, grp, acid1, acid2):

        # amino acids are in a peptide bond
        if int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            n = 0
        # amino acids are identical on the peptide chain
        elif int(self.no1) == int(self.no2):
            n = 0
        # amino acids are next to each other therefore a backbone backbone interaction is present
        elif acid1 and acid2 in grp:
            n = 1
        # amino acids are not adjacent to each other
        else:
            n = 0
        return n

    # sidechain sidechain bonding energy
    def Sidechain_count(self, grp, acid1, acid2):

        # sidechains are in a peptide bond
        if int(self.no1) == int(self.no2) + 1 or int(self.no2) == int(self.no1) + 1:
            n = 0
        # amino acids are identical in the peptide chain
        elif int(self.no1) == int(self.no2):
        # amino acids are next to eachother therefore a sidechain sidechain interaction is present
            n = 0
        elif acid1 and acid2 in grp:
            n = 1
        else:
            n = 0
        return n

    # Van der Waals bonding energy
    def VdW_count(self):

        # amino acids are identical
        if int(self.no1) == int(self.no2):
            n = 0
        # amino acids are adjacent to each other on the peptide chain
        elif int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            n = 0
        # amino acids are in a Van der Waals interaction
        if int(self.no1) != int(self.no2) and (abs(self.R)) <= 6.0 and abs(self.R) >= 3.3:
            n = 1
        # Van der waals forces overlapping with the hydrogen bonds
        elif int(self.no1) != int(self.no2) and abs(self.R) >= 3.0 and abs(self.R) <= 3.3:
            n = 1
        # Van der waals forces are absent
        else:
            n = 0
        return n

    # electrostatic bonding energy
    def Coloumb_count(self):

        # amino acids are identical
        if int(self.no1) == int(self.no2):
            n = 0
        # amino acids are adjacent on the peptide chain
        elif int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            n = 0
        # electrostatic interaction present no overlap with Van der Waals forces
        elif int(self.no1) != int(self.no2) and (abs(self.R) <= 10.0 and abs(self.R) >= 5.0):
            n = 1
        # electrostatic interactions overlap with Van der Waals forces
        elif int(self.no1) != int(self.no2) and (abs(self.R) <= 6.0 and abs(self.R) >= 5.0):
            n = 1
        # electrostatic interactions absent
        else:
            n = 0
        return n