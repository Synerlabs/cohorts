export interface StorageConfig {
  type: 'google-drive' | 'blob-storage';  // extensible for future storage types
  credentials: Record<string, any>;
  settings: Record<string, any>;
}

export interface UploadResult {
  fileId: string;
  url: string;
  metadata: Record<string, any>;
}

export interface StorageProvider {
  initialize(config: StorageConfig): Promise<void>;
  upload(file: File | Buffer, path: string): Promise<UploadResult>;
  getFileUrl(fileId: string): Promise<string>;
  delete(fileId: string): Promise<void>;
} 