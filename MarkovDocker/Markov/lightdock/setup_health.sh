# Exit script on any error

# Update package lists
echo "Updating package lists..."
apt-get update

# Install general dependencies
echo "Installing general dependencies..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    sudo

# Check and install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    # Remove old versions of Docker
    apt-get remove -y docker docker-engine docker.io containerd runc || true

    # Set up Docker repository
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "Docker is already installed."
fi

# Handle legacy apt-key warning
echo "Configuring Yarn repository..."
mkdir -p /etc/apt/keyrings
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor -o /etc/apt/keyrings/yarn.gpg

echo "deb [signed-by=/etc/apt/keyrings/yarn.gpg] https://dl.yarnpkg.com/debian stable main" > /etc/apt/sources.list.d/yarn.list
apt-get update

# Install Yarn
echo "Installing Yarn..."
apt-get install -y yarn

# Ensure necessary directories exist
echo "Ensuring necessary directories and files exist..."
mkdir -p /opt/app/lightdock/mount/input
[ ! -f /opt/app/lightdock/mount/input/message.txt ] && touch /opt/app/lightdock/mount/input/message.txt

# Verify Docker installation
echo "Verifying Docker installation..."
docker --version || { echo "Docker installation failed!"; exit 1; }

echo "All dependencies installed successfully."