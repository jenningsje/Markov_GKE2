def amino_dist(amino_group, current_amino_no, R):

	"""The term amino group refers to the group of four amino acids surrounding a given amino acid (excluding itself) besides the ones it is in a peptide bond with. amino_dist refers to the distances between these amino acids. The table above demonstrates the combinations of distance vectors between each of these amino acids"""

	# Retrieve the amino acids that are in a peptide bond with the amino acid corresponding to the current amino number that are within the group of amino acids that are adjacent to the current amino acid

	previous_amino_no = amino_group[current_amino_no] - 1
	following_amino_no = amino_group[current_amino_no] + 1

	# Drop the amino acids that are in a peptide bond within the data
	amino_group = amino_group.drop(previous_amino_no)
	amino_group = amino_group.drop(following_amino_no)

	# retrieve the distances between all the amino acids
	amino_dist = amino_group[R].diff()

	return amino_dist
