'use server';

import { google } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive/v3';
import { StorageConfig, StorageProvider, UploadResult, GoogleDriveCredentials } from './storage-provider.interface';

export class GoogleDriveProvider implements StorageProvider {
  private drive!: drive_v3.Drive;

  async initialize(config: StorageConfig): Promise<void> {
    if (config.type !== 'google-drive') {
      throw new Error('Invalid provider type');
    }

    const credentials = config.credentials as GoogleDriveCredentials;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async upload(
    file: Buffer | { name: string; type: string; base64: string },
    path: string
  ): Promise<UploadResult> {
    try {
      // Convert file to buffer if it's base64
      const buffer = Buffer.isBuffer(file) 
        ? file 
        : Buffer.from('base64' in file ? file.base64 : '', 'base64');

      const media = {
        mimeType: 'base64' in file ? file.type : 'application/octet-stream',
        body: buffer,
      };

      const response = await this.drive.files.create({
        requestBody: {
          name: 'base64' in file ? file.name : path,
          parents: [path],
        },
        media,
        fields: 'id, webViewLink',
      });

      return {
        fileId: response.data.id!,
        url: response.data.webViewLink!,
        metadata: response.data,
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async getFileUrl(fileId: string): Promise<string> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'webViewLink',
    });
    return response.data.webViewLink!;
  }

  async delete(fileId: string): Promise<void> {
    await this.drive.files.delete({
      fileId,
    });
  }
} 