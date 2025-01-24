'use server';

export type StorageProviderType = 'google-drive' | 'blob-storage';

export interface GoogleDriveCredentials {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface BlobStorageCredentials {
  accountName: string;
  accountKey: string;
}

export interface StorageConfig {
  type: StorageProviderType;
  credentials: GoogleDriveCredentials | BlobStorageCredentials;
  settings: Record<string, any>;
}

export interface UploadResult {
  fileId: string;
  url: string;
  metadata: Record<string, any>;
}

export interface StorageProvider {
  initialize(config: StorageConfig): Promise<void>;
  upload(file: Buffer | {
    name: string;
    type: string;
    base64: string;
  }, path: string): Promise<UploadResult>;
  getFileUrl(fileId: string): Promise<string>;
  delete(fileId: string): Promise<void>;
} 