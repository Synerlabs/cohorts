export interface StorageConfig {
  provider: string;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UploadResult {
  url: string;    // The public URL of the uploaded file
  path: string;   // The storage path of the file (used as storage_path and file_id)
  bucket: string; // The bucket where the file is stored
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
  providerType: string;  // The type of storage provider (e.g., 'supabase', 'google-drive')
  initialize(config?: StorageConfig): Promise<void>;
  upload(file: File, path: string, orgId?: string): Promise<UploadResult>;
  delete(path: string, orgId?: string): Promise<void>;
  generatePath(module: string, filename: string): Promise<string>; // Generate a storage path for a file
} 