curl -fsSLO https://files.pythonhosted.org/packages/.../biopython-1.83.tar.gz
echo "expected_sha256  biopython-1.83.tar.gz" | sha256sum -c -
tar xzf biopython-1.83.tar.gz
python setup.py install