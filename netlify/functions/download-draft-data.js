const { zipFolder } = require('./utils/zip-utils');
const path = require('path');
const fs = require('fs');

exports.handler = async (event, context) => {
  try {
    const draftDataFolder = process.env.DRAFT_DATA_FOLDER || path.join(__dirname, '../../draft_data');
    
    if (!fs.existsSync(draftDataFolder)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Draft data folder not found: ${draftDataFolder}` })
      };
    }

    const tempZipPath = path.join('/tmp', `draft_data_${Date.now()}.zip`);
    
    await zipFolder(draftDataFolder, tempZipPath);
    
    const zipBuffer = fs.readFileSync(tempZipPath);
    const zipBase64 = zipBuffer.toString('base64');
    
    fs.unlinkSync(tempZipPath);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="eval_draft_data.zip"'
      },
      body: zipBase64,
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error creating zip:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to create zip: ${error.message}` })
    };
  }
};

