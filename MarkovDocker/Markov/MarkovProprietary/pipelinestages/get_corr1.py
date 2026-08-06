import pandas as pd
import numpy as np

Comparison = pd.read_csv('Comparison.csv')
Comparison = Comparison.iloc[0:66]
Comparison_arr = Comparison.to_numpy()

Theory = Comparison_arr[:,0]
Experiment = Comparison_arr[:,1]


Theory_Sum = np.sum(Theory)/len(Theory) 

Experiment_Sum = np.sum(Experiment)/len(Experiment)

print(Theory_Sum)
print(Experiment_Sum)

Percentage_Accuracy = 100 + ((Theory_Sum - Experiment_Sum) / Theory_Sum) * 100

print(Percentage_Accuracy)