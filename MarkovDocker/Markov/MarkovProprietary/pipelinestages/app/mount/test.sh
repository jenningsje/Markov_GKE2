#!/bin/bash

FILE="server_one.js"

python3 - "$FILE" <<'PY'
import sys
import re

file = sys.argv[1]

with open(file, "r") as f:
    text = f.read()

new_function = """function getUserVolumeMount() {
  return {
    name: 'markov-app',
    mountPath:
      '/opt/app/MarkovProprietary/pipelinestages/app/mount'
  };
}
"""

# Replace an existing getUserVolumeMount() function.
pattern = r'function\s+getUserVolumeMount\s*\([^)]*\)\s*\{.*?\n\}'

if re.search(pattern, text, re.DOTALL):
    text = re.sub(
        pattern,
        new_function.rstrip(),
        text,
        count=1,
        flags=re.DOTALL
    )
    print("Replaced existing getUserVolumeMount().")

else:
    # Insert immediately before ensureUserWorkspace().
    marker = "async function ensureUserWorkspace(userId)"

    if marker not in text:
        print("ERROR: Could not find ensureUserWorkspace().")
        sys.exit(1)

    text = text.replace(
        marker,
        new_function + "\n" + marker,
        1
    )

    print("Inserted getUserVolumeMount() before ensureUserWorkspace().")

with open(file, "w") as f:
    f.write(text)

print("server_one.js fixed.")
PY
