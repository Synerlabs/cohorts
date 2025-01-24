export interface StorageConfig {
  provider: string;
  credentials: any;
  settings: {
    [key: string]: any;
  };
}

export interface UploadResult {
  fileId: string;
  url: string;
  metadata?: any;
}

export interface GoogleDriveCredentials {
  type: string;
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

export interface StorageProvider {
  initialize(config: StorageConfig): Promise<void>;
  upload(file: any, path: string): Promise<UploadResult>;
  delete(fileId: string): Promise<void>;
} 