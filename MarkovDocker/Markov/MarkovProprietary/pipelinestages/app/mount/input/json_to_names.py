import json

# Access the element in the query key
with open('./input/data.json', 'r') as file:
    data = json.load(file)

    # Access the element in the query key
    element = '"' +  data["query"] + '"' + '\n'

# if there is nothing inside the file then write the data to the names.txt file
with open('./input/names.txt', 'w+') as f:
    line1 = f.readline().strip()
    line2 = f.readline().strip()
    if line1 and line2:
        f.seek(0)
        f.truncate()
        f.write(element)
    else:
        f.write(element)
        f.close()