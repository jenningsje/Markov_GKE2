import os
import logging
import sys
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../pandas'))
sys.path.insert(0, parent_dir)
from pandas import *

# Specify the path to your text file
try:
    stats_path = "./output/stats.txt"
    message_path = "./output/message.txt"

    # Convert the text file into a DataFrame, using regex for whitespace separation
    all_stats = pd.read_csv(stats_path, sep=r'\s+', engine='python')

    # Select and rename columns
    needed_stats = all_stats[['ID', 'NAME', 'USAGE', '/', 'MEM.1', '%.1', 'I/O']]
    renamed_stats = needed_stats.rename(columns={
        'ID': 'SERVER', 
        'NAME': 'CPU%', 
        'USAGE': 'MEM%', 
        '/': 'NET-INPUT', 
        'MEM.1': 'NET-OUTPUT', 
        '%.1': 'BLOCK-INPUT', 
        'I/O': 'BLOCK-OUTPUT'
    })

    # Format the DataFrame as a pretty table
    stats = renamed_stats.to_string(index=False)

    # Save the pretty table to a text file
    with open(message_path, 'a') as f:
        f.write(stats)

    # Print to verify the output
    logging.info(stats)
except Exception as e:
    logging.info("content not present wait for it to appear")
