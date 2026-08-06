#!/bin/bash
set -euo pipefail

# -----------------------------
# Install tar (with SHA-256 verification)
# -----------------------------
TAR_VERSION=1.34
TAR_SHA256="63bebd26879c5e1eea4352f0d03c991f966aeb3ddeb3c7445c902568d5411d28"

curl -LO https://ftp.gnu.org/gnu/tar/tar-${TAR_VERSION}.tar.xz

echo "${TAR_SHA256}  tar-${TAR_VERSION}.tar.xz" | sha256sum -c -

tar xf tar-1.34.tar.xz
cd tar-${TAR_VERSION}
export FORCE_UNSAFE_CONFIGURE=1
./configure --prefix=/usr/local
make -j"$(nproc)"
make install
cd ..
rm -rf tar-${TAR_VERSION}*

# -----------------------------
# Install docker
# -----------------------------
# Variables for Docker
apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community docker-cli

echo "Docker installation complete."

# -----------------------------
# Install OpenSSH (with SHA-256 verification)
# -----------------------------
OPENSSH_VERSION="9.9p1"
OPENSSH_SHA256="b343fbcdbff87f15b1986e6e15d6d4fc9a7d36066be6b7fb507087ba8f966c02"

TARBALL_URL="https://cdn.openbsd.org/pub/OpenBSD/OpenSSH/portable/openssh-${OPENSSH_VERSION}.tar.gz"

wget -q "$TARBALL_URL" -O "openssh-${OPENSSH_VERSION}.tar.gz"
echo "${OPENSSH_SHA256}  openssh-${OPENSSH_VERSION}.tar.gz" | sha256sum -c -

tar -xzf "openssh-${OPENSSH_VERSION}.tar.gz"
cd "openssh-${OPENSSH_VERSION}"
./configure --prefix=/usr/local \
            --sysconfdir=/etc/ssh \
            --with-ssl-engine \
            --with-privsep-path=/var/empty
make -j$(nproc)
make install
cd ..
rm -rf "openssh-${OPENSSH_VERSION}"*

# -----------------------------
# Install GnuTLS (with SHA-256 verification)
# -----------------------------
GNUTLS_VERSION="3.7.0"
GNUTLS_SHA256="49e2a22691d252c9f24a9829b293a8f359095bc5a818351f05f1c0a5188a1df8"

# 1. Install missing dependencies and Unbound to generate the root key
apk add --no-cache gmp-dev unbound

# 2. Generate the DNSSEC root key (Fixes the configure warning)
mkdir -p /etc/unbound
unbound-anchor -a "/etc/unbound/root.key" || true

# 3. Download and Verify
if [ ! -f "gnutls-${GNUTLS_VERSION}.tar.xz" ]; then
    wget -q https://www.gnupg.org/ftp/gcrypt/gnutls/v${GNUTLS_VERSION%.*}/gnutls-${GNUTLS_VERSION}.tar.xz
fi
echo "${GNUTLS_SHA256}  gnutls-${GNUTLS_VERSION}.tar.xz" | sha256sum -c -

# 4. Extract
tar xf gnutls-${GNUTLS_VERSION}.tar.xz
cd gnutls-${GNUTLS_VERSION}

# 5. FIX: The "nodiscard" error (fixes the error you just posted)
# We remove the macro that modern GCC doesn't like in the Gnulib files
find src/gl/ -type f -name "*.h" -exec sed -i 's/_GL_ATTRIBUTE_NODISCARD//g' {} +

# 6. Configure
./configure --prefix=/opt/gnutls \
    --with-included-libtasn1 \
    --with-included-unistring \
    --without-p11-kit \
    --without-unbound \
    --with-unbound-root-key-file=/etc/unbound/root.key \
    --disable-doc \
    --disable-tests

# 7. Build and Install
make -j$(nproc)
make install

# Verify installation
/usr/local/go/bin/go version

# 8. Cleanup
cd ..
rm -rf gnutls-${GNUTLS_VERSION}*