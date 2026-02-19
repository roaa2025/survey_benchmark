# Deployment Guide for Netlify

## Overview

This app can be deployed to Netlify using serverless functions. The draft data download feature requires special handling.

## Setup Steps

### 1. Prepare Draft Data Folder

You have two options:

**Option A: Include draft data in repository (recommended for small datasets)**
- Copy your draft data folder to `draft_data/` in the project root
- Commit it to your repository
- The Netlify function will use this folder

**Option B: Use environment variable (for large datasets)**
- Upload draft data to a cloud storage service (S3, etc.)
- Set `DRAFT_DATA_FOLDER` environment variable in Netlify dashboard
- Modify the function to download from cloud storage

### 2. Install Dependencies

```bash
npm install
```

This installs `archiver` package needed for the Netlify function.

### 3. Deploy to Netlify

**Via Netlify CLI:**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**Via Git Integration:**
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Netlify will auto-detect settings from `netlify.toml`

### 4. Configure Environment Variables (if needed)

If using Option B above, set in Netlify Dashboard:
- Go to Site settings > Environment variables
- Add `DRAFT_DATA_FOLDER` with your path

## File Structure

```
benchmark_ui/
├── netlify.toml                    # Netlify configuration
├── package.json                    # Node.js dependencies
├── netlify/
│   └── functions/
│       ├── download-draft-data.js  # Serverless function
│       └── utils/
│           └── zip-utils.js        # Zip utility
├── reports/
│   └── survey_builder_analytics.html
└── draft_data/                     # Include this folder (Option A)
```

## Alternative: Pre-build Zip File (Simpler - Recommended)

If you prefer not to use serverless functions (better for large files):

1. Run the build script to create the zip:
   ```bash
   python build-zip.py
   ```
   This creates `reports/draft_data.zip`

2. Update the HTML button to download directly:
   Change the `downloadDraftData()` function to:
   ```javascript
   function downloadDraftData() {
       const a = document.createElement('a');
       a.href = 'draft_data.zip';
       a.download = 'eval_draft_data.zip';
       a.click();
   }
   ```

3. Commit `draft_data.zip` to your repository
4. No serverless functions needed - pure static hosting
5. Re-run `build-zip.py` and commit when draft data changes

**Note:** Netlify Functions have timeout limits (10s free, 26s paid). For large zip files, pre-building is recommended.

## Local Development

For local development, the Flask server (`server.py`) still works:
```bash
python server.py
```

The HTML automatically detects localhost and uses Flask endpoints.

