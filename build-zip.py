import os
import zipfile
from pathlib import Path

DRAFT_DATA_FOLDER = r"C:\Users\roaa.alashqar\Desktop\eval draft data"
OUTPUT_ZIP = os.path.join(os.path.dirname(__file__), "reports", "draft_data.zip")


def zip_folder(folder_path, zip_path):
    """Create a zip file from a folder"""
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        folder_path_obj = Path(folder_path)
        if not folder_path_obj.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")
        
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(folder_path_obj.parent)
                zipf.write(file_path, arcname)


if __name__ == '__main__':
    print(f"Zipping {DRAFT_DATA_FOLDER}...")
    try:
        if os.path.exists(OUTPUT_ZIP):
            os.remove(OUTPUT_ZIP)
        
        zip_folder(DRAFT_DATA_FOLDER, OUTPUT_ZIP)
        print(f"Success! Created {OUTPUT_ZIP}")
        print(f"File size: {os.path.getsize(OUTPUT_ZIP) / 1024 / 1024:.2f} MB")
    except Exception as e:
        print(f"Error: {e}")

