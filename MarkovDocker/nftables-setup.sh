#!/bin/sh
# Minimal nftables firewall setup for Alpine container

# Exit on any error
set -e

echo "Setting up nftables firewall..."

# Flush existing rules (optional, ensures a clean start)
nft flush ruleset || true

# Create table and chains
nft add table inet filter

# Input chain
nft add chain inet filter input { type filter hook input priority 0 \; policy drop\; }

# Forward chain
nft add chain inet filter forward { type filter hook forward priority 0 \; policy drop\; }

# Output chain
nft add chain inet filter output { type filter hook output priority 0 \; policy accept\; }

# Allow loopback
nft add rule inet filter input iif lo accept

# Allow established and related connections
nft add rule inet filter input ct state established,related accept

# Optional: allow SSH (if you need container access via port 22)
# nft add rule inet filter input tcp dport 22 accept

# Allow HTTPS
nft add rule inet filter input tcp dport 443 accept

echo "Firewall rules applied:"
nft list ruleset

exec /bin/bash /opt/app/lightdock/run_lightdock.sh