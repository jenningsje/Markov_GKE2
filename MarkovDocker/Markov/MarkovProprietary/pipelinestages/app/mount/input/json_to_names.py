import os
import json

# User ID must have been supplied by the authenticated Node server.
user_id = os.environ.get("USER_ID")

if not user_id:
    raise RuntimeError("Authenticated user ID is required")

# Prevent path traversal / malformed IDs.
if not user_id.isdigit():
    raise RuntimeError("Invalid user ID")

user_dir = f"./user-{user_id}"
input_dir = f"{user_dir}/input"

data_path = f"{input_dir}/data.json"
names_path = f"{input_dir}/names.txt"

# Only now do filesystem operations.
with open(data_path, "r", encoding="utf-8") as file:
    data = json.load(file)

if "query" not in data:
    raise RuntimeError("query is missing from data.json")

element = '"' + str(data["query"]) + '"\n'

with open(names_path, "w", encoding="utf-8") as f:
    f.write(element)