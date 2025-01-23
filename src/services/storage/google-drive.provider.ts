import { google } from 'googleapis';
import { drive_v3 } from 'googleapis/build/src/apis/drive/v3';
import { StorageConfig, StorageProvider, UploadResult } from './storage-provider.interface';

export class GoogleDriveProvider implements StorageProvider {
  private drive!: drive_v3.Drive;
  private config!: StorageConfig;

  async initialize(config: StorageConfig): Promise<void> {
    this.config = config;
    const auth = new google.auth.GoogleAuth({
      credentials: config.credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async upload(file: File | Buffer, path: string): Promise<UploadResult> {
    const media = {
      mimeType: file instanceof File ? file.type : 'application/octet-stream',
      body: file,
    };

    const fileMetadata = {
      name: path.split('/').pop(),
      parents: [this.config.settings.folderId], // Folder ID from settings
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    return {
      fileId: response.data.id!,
      url: response.data.webViewLink!,
      metadata: response.data,
    };
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