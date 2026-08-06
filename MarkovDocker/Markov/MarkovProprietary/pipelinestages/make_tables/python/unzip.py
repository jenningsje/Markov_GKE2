import zipfile
import shutil

zipped_dbs = ["K_elec_dict.py.zip", "abb_convert.py.zip", "nuclei_dict.py.zip", "V_elec_sqrd.py.zip", "VdW_tables.py.zip", "../json/nuclei_dict.json.zip"]
for zipped_db in zipped_dbs:
    zip_ref = zipfile.ZipFile(zipped_db, 'r')
    zip_ref.extractall('.')
    zip_ref.close()

shutil.move("nuclei_dict.json", "../json/nuclei_dict.json")