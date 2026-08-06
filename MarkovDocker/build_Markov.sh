#!/bin/bash
mkdir ./Markov/lightdock/swarm_0

mkdir -p ~/seccomp
cat > ~/seccomp/seccomp.json << 'EOF'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "architectures": [
    "SCMP_ARCH_X86_64",
    "SCMP_ARCH_X86",
    "SCMP_ARCH_X32"
  ],
  "syscalls": []
}
EOF

docker build -t ssh-server -f Dockerfile.ssh .
docker compose --no-cache -t build .
docker compose up
rm -rf ./Markov/lightdock/swarm_0

# Path to HTML file
HTML_FILE_PATH="/html/index.html"

# Nginx container name
CONTAINER_NAME="nginx"

# Nginx document root inside the container
NGINX_HTML_PATH="/etc/nginx/html/index.html"

# Step 1: Check if the HTML file exists locally
if [ ! -f "$HTML_FILE_PATH" ]; then
    echo "Error: HTML file not found at $HTML_FILE_PATH"
    exit 1
fi

# Step 2: Get the container ID using the container name
CONTAINER_ID=$(docker ps -q -f "name=$CONTAINER_NAME")

# Check if the container ID is found
if [ -z "$CONTAINER_ID" ]; then
    echo "Error: No running container found with name $CONTAINER_NAME"
    exit 1
fi

# Step 3: Copy the HTML file into the Nginx container
echo "Copying HTML file to Nginx container..."
docker cp "$HTML_FILE_PATH" "$CONTAINER_ID:$NGINX_HTML_PATH"

# Step 4: Check if the copy command succeeded
if [ $? -eq 0 ]; then
    echo "HTML file copied successfully."
else
    echo "Error: Failed to copy HTML file to Nginx container."
    exit 1
fi

# Step 5: Reload Nginx to apply the new HTML file
echo "Reloading Nginx to apply changes..."
docker exec -it "$CONTAINER_ID" nginx -s reload

# Step 6: Confirm Nginx has been reloaded
if [ $? -eq 0 ]; then
    echo "Nginx reloaded successfully. The new HTML file is now being served."
else
    echo "Error: Failed to reload Nginx."
    exit 1
fi
