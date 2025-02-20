import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { StorageConfig, UploadResult, StorageProvider } from './storage-provider.interface';

const DEFAULT_BUCKET = 'default';

class SupabaseStorageProvider implements StorageProvider {
  readonly providerType = 'supabase';

  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.initialize = this.initialize.bind(this);
    this.upload = this.upload.bind(this);
    this.delete = this.delete.bind(this);
    this.generatePath = this.generatePath.bind(this);
  }

  private async ensureBucketExists(supabase: any, bucket: string): Promise<void> {
    try {
      // Try to get bucket info to check if it exists
      const { data: buckets, error } = await supabase.storage.getBucket(bucket);
      
      if (error && error.message.includes('not found')) {
        // Bucket doesn't exist, create it
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true, // Make bucket public for reading files
          fileSizeLimit: 52428800, // 50MB limit
        });
        
        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
        console.log(`Created new bucket: ${bucket}`);

        // Update bucket to allow public access
        const { error: updateError } = await supabase.storage.updateBucket(bucket, {
          public: true,
          allowedMimeTypes: [
            'application/pdf',
            'image/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            'application/json'
          ],
          fileSizeLimit: 52428800
        });

        if (updateError) {
          throw new Error(`Failed to update bucket settings: ${updateError.message}`);
        }
      } else if (error) {
        throw error;
      } else {
        // Bucket exists, ensure it's public
        const { error: updateError } = await supabase.storage.updateBucket(bucket, {
          public: true,
          allowedMimeTypes: [
            'application/pdf',
            'image/*',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            'application/json'
          ],
          fileSizeLimit: 52428800
        });

        if (updateError) {
          throw new Error(`Failed to update bucket settings: ${updateError.message}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw error;
    }
  }

  private getBucketName(orgId?: string): string {
    if (!orgId) {
      console.warn('No organization ID provided, using default bucket');
      return DEFAULT_BUCKET;
    }
    return `org-${orgId}`;
  }

  generatePath(module: string, filename: string): string {
    // Clean and normalize the module path
    const cleanModule = module
      .split('/')
      .map(part => part.trim())
      .filter(Boolean)
      .join('/');

    // Clean the filename to ensure it's safe for storage
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Generate date-based path components
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Generate a unique ID for the file
    const uniqueId = crypto.randomUUID();
    
    // Combine all components into a clean path
    return [
      cleanModule,
      year,
      month,
      day,
      uniqueId,
      cleanFilename
    ].join('/');
  }

  async initialize(config?: StorageConfig): Promise<void> {
    const supabase = await createServiceRoleClient();
    const bucket = this.getBucketName(config?.settings?.orgId);
    await this.ensureBucketExists(supabase, bucket);
  }

  async upload(file: File | { name: string; type: string; base64?: string }, path: string, orgId?: string): Promise<UploadResult> {
    const supabase = await createServiceRoleClient();
    const bucket = this.getBucketName(orgId);

    // Ensure bucket exists
    await this.ensureBucketExists(supabase, bucket);
    
    let fileData: File | Blob;
    if ('base64' in file && file.base64) {
      try {
        // Handle both prefixed and raw base64 strings
        const base64String = file.base64.includes('base64,') 
          ? file.base64.split('base64,')[1] 
          : file.base64;

        // Decode base64
        const byteString = atob(base64String);
        const mimeType = file.type || 'application/octet-stream';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        fileData = new Blob([ab], { type: mimeType });
      } catch (error) {
        console.error('Error processing base64 data:', error);
        throw new Error('Failed to process file data: Invalid base64 encoding');
      }
    } else if (file instanceof File) {
      fileData = file;
    } else {
      throw new Error('Invalid file data provided');
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, fileData, {
        upsert: true,
        contentType: fileData.type
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload succeeded but no data was returned');
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      url: publicUrl.publicUrl,
      path,
      bucket
    };
  }

  async delete(path: string, orgId?: string): Promise<void> {
    const supabase = await createServiceRoleClient();
    const bucket = this.getBucketName(orgId);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

// Create and export the singleton instance
export const supabaseProvider = new SupabaseStorageProvider();

// Export the type for type checking
export type { StorageProvider }; 