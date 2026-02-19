import os
import zipfile
from flask import Flask, send_file, send_from_directory
from flask_cors import CORS
from pathlib import Path

app = Flask(__name__, static_folder='reports')
CORS(app)

DRAFT_DATA_FOLDER = r"C:\Users\roaa.alashqar\Desktop\eval draft data"
TEMP_ZIP_PATH = os.path.join(os.path.dirname(__file__), "draft_data.zip")


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


@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('reports', 'survey_builder_analytics.html')


@app.route('/dashboard/<path:filename>')
def serve_dashboard(filename):
    """Serve dashboard files"""
    return send_from_directory('dashboard', filename)


@app.route('/draft_data.zip')
def serve_draft_data_zip():
    """Serve the pre-built draft data zip file"""
    zip_path = os.path.join('reports', 'draft_data.zip')
    if os.path.exists(zip_path):
        return send_file(
            zip_path,
            as_attachment=True,
            download_name='eval_draft_data.zip',
            mimetype='application/zip'
        )
    else:
        return {"error": "draft_data.zip not found. Run 'python build-zip.py' to create it."}, 404


@app.route('/download-draft-data')
def download_draft_data():
    """Zip and download the draft data folder (fallback for dynamic generation)"""
    try:
        if os.path.exists(TEMP_ZIP_PATH):
            os.remove(TEMP_ZIP_PATH)
        
        zip_folder(DRAFT_DATA_FOLDER, TEMP_ZIP_PATH)
        
        return send_file(
            TEMP_ZIP_PATH,
            as_attachment=True,
            download_name='eval_draft_data.zip',
            mimetype='application/zip'
        )
    except FileNotFoundError as e:
        return {"error": str(e)}, 404
    except Exception as e:
        return {"error": f"Failed to create zip: {str(e)}"}, 500


if __name__ == '__main__':
    print("Starting server...")
    print(f"Serving HTML from: {os.path.abspath('reports')}")
    print(f"Draft data folder: {DRAFT_DATA_FOLDER}")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)

