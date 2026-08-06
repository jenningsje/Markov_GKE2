import json

with open('./make_tables/json/nuclei_dict.json', 'r') as file:
    data = json.load(file)

print(data)
