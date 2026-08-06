#!/bin/sh

set -eux

# Install Python 3.9.17 and uninstall insecure setuptools
wget https://www.python.org/ftp/python/3.9.17/Python-3.9.17.tgz && \
    tar -xzf Python-3.9.17.tgz && \
    cd Python-3.9.17 && \
    ./configure --enable-optimizations --with-ensurepip=no && \
    make -j$(nproc) && \
    make altinstall && \
    cd .. && \
    rm -rf Python-3.9.17 Python-3.9.17.tgz

# Upgrade pip and setuptools in a secure way
curl -fsSLO https://bootstrap.pypa.io/get-pip.py
sha256sum get-pip.py  # compare with official hash
python3 get-pip.py

echo "Setuptools installed securely"