import json
import os

# Load the JSON data from the file
with open('data.json', 'r') as file:
    data = json.load(file)

# Access the element in the query key and enclose it with quotation marks
element = data["query"] + 

# Open the file in append mode and write the element
with open("names.txt", "a") as f:
    f.write(element)
