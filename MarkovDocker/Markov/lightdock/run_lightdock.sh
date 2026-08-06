#!/bin/bash
set -e

# Activate virtual environment
source /opt/app/lightdock/venv/bin/activate

# Ensure we're in the right working directory
cd /opt/app/lightdock

# Remove old swarm_0 if it exists
if [ -d "swarm_0" ]; then
  echo "Cleaning up existing swarm_0 directory..."
  rm -rf swarm_0
fi

# Run the main Python app
exec python Run_Markov.py