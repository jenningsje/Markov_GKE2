class energy:

    def __init__(self, R, no1, no2):
        self.R = R
        self.no1 = no1
        self.no2 = no2

    # backbone-backbone bonding energy
    def Backbone_E(self, Hbb, grp, acid1, acid2):

        # amino acids are in a peptide bond
        if int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            Hbb = 0
        # amino acids are identical on the peptide chain
        elif int(self.no1) == int(self.no2):
            Hbb = 0
        # amino acids are next to each other therefore a backbone backbone interaction is present
        elif acid1 and acid2 in grp:
            Hbb = -3.331e-19
        # amino acids are not adjacent to each other
        else:
            Hbb = 0
        return Hbb

    # sidechain sidechain bonding energy
    def Sidechain_E(self, H, M, Hsc, grp, acid1, acid2):

        # sidechains are in a peptide bond
        if int(self.no1) == int(self.no2) + 1 or int(self.no2) == int(self.no1) + 1:
            Hsc = 0
        # amino acids are identical in the peptide chain
        elif int(self.no1) == int(self.no2):
        # amino acids are next to eachother therefore a sidechain sidechain interaction is present
            Hsc = 0
        elif acid1 and acid2 in grp:
            Hsc = H * M * 3 / 16
        else:
            Hsc = 0
        return Hsc

    # Van der Waals bonding energy
    def VdW_E(self, VdW, Eplus, VeSqrd, Vplus):

        a0 = .529 * pow(10, -11)
        e_elec = 1.60217663 * pow(10, -19)
        elec_const = 6.5 * pow(e_elec, 2) * a0

        # amino acids are identical
        if int(self.no1) == int(self.no2):
            VdW = 0
        # amino acids are adjacent to each other on the peptide chain
        elif int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            VdW = 0
        # amino acids are in a Van der Waals interaction
        if int(self.no1) != int(self.no2) and (abs(self.R)) <= 6.0 and abs(self.R) >= 3.3:
            VdW = Eplus * (1 / 2) + elec_const * (VeSqrd / pow(self.R, 6)) * (1 / 2)
        # Van der waals forces overlapping with the hydrogen bonds
        elif int(self.no1) != int(self.no2) and abs(self.R) >= 3.0 and abs(self.R) <= 3.3:
            VdW = Vplus * (1 / 2) + elec_const * (VeSqrd / pow(self.R, 6)) * (1 / 2)
        # Van der waals forces are absent
        else:
            VdW = 0
        return VdW

    # electrostatic bonding energy
    def Coloumb_E(self, Coloumb, E_plus, V_plus, nuclei_V):

        eV_to_joules = 1.60218e-19

        # amino acids are identical
        if int(self.no1) == int(self.no2):
            Coloumb = 0
        # amino acids are adjacent on the peptide chain
        elif int(self.no1) == int(self.no2) + 1 or int(self.no1) + 1 == int(self.no2):
            Coloumb = 0
        # electrostatic interaction present no overlap with Van der Waals forces
        elif int(self.no1) != int(self.no2) and (abs(self.R) <= 10.0 and abs(self.R) >= 5.0):
            Coloumb = (nuclei_V + E_plus) * (6 / (27 * 27 * 16)) * eV_to_joules * (1 / 2)
        # electrostatic interactions overlap with Van der Waals forces
        elif int(self.no1) != int(self.no2) and (abs(self.R) <= 6.0 and abs(self.R) >= 5.0):
            Coloumb = (nuclei_V + V_plus) * (6 / (27 * 27 * 16)) * eV_to_joules * (1 / 2)
        # electrostatic interactions absent
        else:
            Coloumb = 0
        return Coloumb
