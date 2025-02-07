import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';

export interface FileUploadResult {
  path: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export async function uploadFile(
  file: File,
  bucket: string = 'form-uploads',
  folder: string = 'files'
): Promise<FileUploadResult> {
  const supabase = createClientComponentClient<Database>();

  // Generate a unique file name to avoid collisions
  const timestamp = new Date().getTime();
  const uniqueFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${folder}/${uniqueFileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export async function deleteFile(
  path: string,
  bucket: string = 'form-uploads'
): Promise<void> {
  const supabase = createClientComponentClient<Database>();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
} 