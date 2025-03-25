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
    
    let fileData: any;
    
    // Check if it's a base64 object first
    if (typeof file === 'object' && file !== null && 'base64' in file && file.base64) {
      try {
        // Handle both prefixed and raw base64 strings
        const base64String = file.base64.includes('base64,') 
          ? file.base64.split('base64,')[1] 
          : file.base64;

        // Decode base64 - handle both browser and Node.js environments
        const mimeType = file.type || 'application/octet-stream';
        
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
          // We're definitely in Node.js, use Buffer directly which is more reliable
          console.log("Detected Node.js environment, using Buffer directly for base64");
          try {
            fileData = Buffer.from(base64String, 'base64');
            console.log("Created buffer directly from base64, size:", fileData.length);
          } catch (bufferError) {
            console.error("Error creating buffer from base64:", bufferError);
            throw new Error('Failed to create buffer from base64 data');
          }
        } else {
          // Browser environment or unknown - try the ArrayBuffer approach
          let byteString;
          if (typeof atob !== 'undefined') {
            // Browser environment
            byteString = atob(base64String);
          } else {
            // Node.js environment fallback, though we shouldn't get here with the check above
            byteString = Buffer.from(base64String, 'base64').toString('binary');
          }
          
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          // Create appropriate file data based on environment
          if (typeof Blob !== 'undefined') {
            // Browser environment
            fileData = new Blob([ab], { type: mimeType });
          } else {
            // Node.js environment
            try {
              console.log("Creating buffer in Node.js environment for upload");
              const buffer = Buffer.from(ia);
              fileData = buffer;
              console.log("Buffer created successfully, size:", buffer.length);
            } catch (bufferError) {
              console.error("Error creating buffer:", bufferError);
              // Fallback to using the array directly if buffer creation fails
              fileData = ia;
            }
          }
        }
      } catch (error) {
        console.error('Error processing base64 data:', error);
        throw new Error('Failed to process file data: Invalid base64 encoding');
      }
    } else if (typeof File !== 'undefined' && file instanceof File) {
      // Only use File check in environments where File exists (browser)
      fileData = file;
    } else if (file instanceof Blob) {
      // Check if it's a Blob (works in both Node.js and browser)
      fileData = file;
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(file)) {
      // If it's a Buffer (Node.js)
      fileData = file;
    } else if (typeof file === 'object' && file !== null) {
      // Treat as a plain object with data
      fileData = file;
    } else {
      throw new Error('Invalid file data provided');
    }

    // Determine content type - ensure we always have one
    let contentType = 'application/octet-stream'; // Default fallback
    
    if (fileData.type) {
      contentType = fileData.type;
    } else if (typeof file === 'object' && file.type) {
      contentType = file.type;
    } else if (path) {
      // Try to determine content type from file extension
      const ext = path.split('.').pop()?.toLowerCase();
      if (ext) {
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'txt': 'text/plain',
          'csv': 'text/csv',
          'json': 'application/json'
        };
        if (mimeTypes[ext]) {
          contentType = mimeTypes[ext];
        }
      }
    }

    // Log upload attempt for debugging
    console.log(`Attempting to upload file to bucket '${bucket}', path: '${path}'`);
    console.log(`File data type: ${typeof fileData}`, fileData instanceof Buffer ? 'Buffer' : 'Not Buffer');
    console.log(`Content type being used: ${contentType}`);

    try {
      let uploadData: any;
      let uploadError: any = null;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileData, {
          upsert: true,
          contentType: contentType
        });

      uploadData = data;
      uploadError = error;

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        if (uploadError.message.includes('mime type')) {
          console.error('Content type error. Attempted with:', contentType);
          // Try one more time with a generic safe content type
          console.log('Retrying with generic application/octet-stream content type');
          const retryResult = await supabase.storage
            .from(bucket)
            .upload(path, fileData, {
              upsert: true,
              contentType: 'application/octet-stream'
            });
            
          if (retryResult.error) {
            console.error('Retry also failed:', retryResult.error);
            throw new Error(`Failed to upload file: ${uploadError.message}. Retry also failed: ${retryResult.error.message}`);
          }
          
          uploadData = retryResult.data;
        } else {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
      }

      if (!uploadData) {
        throw new Error('Upload succeeded but no data was returned');
      }

      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      console.log('Upload successful, public URL:', publicUrl.publicUrl);
      
      return {
        url: publicUrl.publicUrl,
        path,
        bucket
      };
    } catch (uploadError) {
      console.error('Unexpected error during upload:', uploadError);
      throw uploadError;
    }
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
const provider = new SupabaseStorageProvider();

// Export functions individually to maintain the interface structure
export const initialize = provider.initialize;
export const upload = provider.upload;
export const deleteFile = provider.delete;
export const generatePath = provider.generatePath;

// Export the provider instance
export const supabaseProvider: StorageProvider = provider;

// Default export for easy importing
export default provider;

// Export the type for type checking
export type { StorageProvider }; 