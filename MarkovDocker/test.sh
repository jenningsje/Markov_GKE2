#!/bin/bash
set -e

echo "Replacing 10Gi -> 12Gi"

grep -rl "10Gi" . --include="*.yaml" --include="*.yml" | while read -r file; do
    echo "Updating $file"
    sed -i '' 's/10Gi/12Gi/g' "$file"
done

echo "Done."

echo "Files now containing 12Gi:"
grep -rl "12Gi" . --include="*.yaml" --include="*.yml"
