'use server';

import { google } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive/v3';
import { StorageConfig, StorageProvider, UploadResult, GoogleDriveCredentials } from './storage-provider.interface';

let drive: drive_v3.Drive | null = null;
let settings: StorageConfig['settings'] | null = null;

export async function initialize(config: StorageConfig): Promise<void> {
  console.log('Initializing Google Drive provider with config:', {
    hasCredentials: !!config.credentials,
    credentialType: config.credentials?.type,
    hasSettings: !!config.settings
  });

  const credentials = config.credentials as GoogleDriveCredentials;
  
  if (!credentials || !credentials.type || credentials.type !== 'service_account') {
    throw new Error('Invalid Google Drive credentials: Must be a service account');
  }

  settings = config.settings;
if (!settings?.folderId) {
  throw new Error('Google Drive folder ID is required in settings');
}

  console.log('Creating Google Auth client...');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  console.log('Creating Google Drive client...');
  drive = google.drive({ version: 'v3', auth });
  console.log('Google Drive provider initialized successfully');
}

export async function upload(fileData: any, path: string): Promise<UploadResult> {
  if (!drive) {
    throw new Error('Google Drive not initialized');
  }

  if (!settings?.folderId) {
    throw new Error('Google Drive folder ID not set');
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const originalFilename = path.split('/').pop();
    const extension = originalFilename?.includes('.') ? `.${originalFilename.split('.').pop()}` : '';
    
    // Construct new path: module/year/month/day/uuid.ext
    const [module] = path.split('/');
    const newPath = `${module}/${year}/${month}/${day}/${uuid}${extension}`;

    console.log('Starting file upload to Google Drive:', { 
      originalPath: path,
      newPath,
      originalFilename,
      type: fileData.type,
      hasBase64: !!fileData.base64,
      base64Length: fileData.base64?.length
    });

    const fileMetadata = {
      name: `${uuid}${extension}`,
      parents: [settings.folderId] // You can customize the parent folder ID here
    };

    console.log('File metadata for upload:', fileMetadata);

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData.base64, 'base64');
    console.log('Created buffer from base64, size:', buffer.length);

    const media = {
      mimeType: fileData.type || 'application/octet-stream',
      // Create a readable stream from the buffer
      body: require('stream').Readable.from(buffer)
    };

    console.log('Created media object:', {
      mimeType: media.mimeType,
      hasBody: !!media.body
    });

    console.log('Calling Google Drive API to create file...');
    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log('Google Drive API response:', {
      success: !!uploadResponse.data,
      id: uploadResponse.data.id,
      hasWebViewLink: !!uploadResponse.data.webViewLink
    });

    if (!uploadResponse.data.id || !uploadResponse.data.webViewLink) {
      throw new Error('Failed to get file ID or URL from Google Drive');
    }

    console.log('Setting file permissions...');
    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    console.log('File permissions set successfully');

    console.log('Getting updated file info...');
    // Get the updated file with webViewLink
    const updatedFile = await drive.files.get({
      fileId: uploadResponse.data.id,
      fields: 'id, webViewLink'
    });
    console.log(updatedFile);
    console.log('Got updated file info:', {
      id: updatedFile.data.id,
      hasWebViewLink: !!updatedFile.data.webViewLink
    });

    return {
      fileId: uploadResponse.data.id,
      url: updatedFile.data.webViewLink || uploadResponse.data.webViewLink,
      metadata: uploadResponse.data,
      storagePath: newPath,
      originalFilename: originalFilename || ''
    };
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    if (error.response) {
      console.error('Google Drive API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!drive) {
    throw new Error('Google Drive not initialized');
  }

  try {
    await drive.files.delete({ fileId });
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
} 