#!/bin/bash

set -e

FILE="server_one.js"
BACKUP="server_one.js.backup"

echo "Modifying $FILE..."

if [ ! -f "$FILE" ]; then
    echo "ERROR: $FILE not found."
    exit 1
fi

# Create backup
cp "$FILE" "$BACKUP"
echo "Backup created: $BACKUP"

python3 - <<'PY'
from pathlib import Path

file = Path("server_one.js")
text = file.read_text()

old = """  await fs.promises.mkdir(
    userInputDir,
    {
      recursive: true
    }
  );

  await copyDirectoryContents(
    templateInputDir,
    userInputDir
  );
"""

new = """  await fs.promises.mkdir(
    userInputDir,
    {
      recursive: true
    }
  );

  // ==========================================================
  // COPY server_two.js INTO USER WORKSPACE
  // ==========================================================

  const serverTwoSource =
    path.join(
      mountRoot,
      'server_two.js'
    );

  const serverTwoDestination =
    path.join(
      userRoot,
      'server_two.js'
    );

  await fs.promises.copyFile(
    serverTwoSource,
    serverTwoDestination
  );

  console.log(
    `Copied server_two.js to user workspace: ${serverTwoDestination}`
  );

  await copyDirectoryContents(
    templateInputDir,
    userInputDir
  );
"""

if old not in text:
    raise SystemExit(
        "ERROR: Could not find the expected workspace setup block. "
        "No changes were made."
    )

if "COPY server_two.js INTO USER WORKSPACE" in text:
    raise SystemExit(
        "ERROR: server_two.js copy logic already appears to exist. "
        "No changes were made."
    )

text = text.replace(old, new, 1)

file.write_text(text)

print("server_one.js modified successfully.")
PY

echo
echo "Verifying modification..."
grep -n -A35 -B5 "COPY server_two.js INTO USER WORKSPACE" "$FILE"

echo
echo "Done."
echo "Original backed up to: $BACKUP"
