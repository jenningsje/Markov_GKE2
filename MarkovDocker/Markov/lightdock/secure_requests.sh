#!/usr/bin/env bash
set -euo pipefail

PACKAGE="requests"
VERSION="2.32.3"

# Official PyPI source tarball
URL="https://files.pythonhosted.org/packages/source/r/requests/requests-${VERSION}.tar.gz"

# Expected SHA256 hash (verify from PyPI release page before use)
EXPECTED_SHA256="55365417734eb18255590a9ff9eb97e9e1da868d4ccd6402399eaf68af20a760"

TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"

echo "[+] Downloading ${PACKAGE} ${VERSION}..."
curl -fsSL -o "${PACKAGE}.tar.gz" "$URL"

echo "[+] Verifying SHA256..."
echo "${EXPECTED_SHA256}  ${PACKAGE}.tar.gz" | sha256sum -c -

echo "[+] Extracting..."
tar -xzf "${PACKAGE}.tar.gz"
cd "${PACKAGE}-${VERSION}"

echo "[+] Installing via pip..."
python3 -m pip install .

echo "[+] Cleaning up..."
cd /
rm -rf "$TMP_DIR"

echo "[✓] ${PACKAGE} installed securely."