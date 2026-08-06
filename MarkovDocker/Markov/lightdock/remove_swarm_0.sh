# Remove old swarm_0 if it exists
if [ -d "swarm_0" ]; then
  echo "Cleaning up existing swarm_0 directory..."
  rm -rf swarm_0
fi