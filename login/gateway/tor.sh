#!/bin/sh
set -e

apk add --no-cache tor su-exec iproute2 net-tools >/dev/null 2>&1 || true

TORRC="/etc/tor/torrc"
HS_DIR="/var/lib/tor/my_service"

mkdir -p /etc/tor
mkdir -p "$HS_DIR"

chmod 700 "$HS_DIR"
chown -R tor:tor /var/lib/tor || true

cat > "$TORRC" <<EOF
SocksPort 9050
HiddenServiceDir $HS_DIR
HiddenServicePort 80 127.0.0.1:80
EOF

echo "[+] torrc configured"

su-exec tor tor -f "$TORRC" &

TOR_PID=$!

sleep 10

if kill -0 $TOR_PID 2>/dev/null; then
    echo "[+] Tor started"
else
    echo "[!] Tor failed"
    exit 1
fi

echo "[+] Continuing to nginx"

exit 0