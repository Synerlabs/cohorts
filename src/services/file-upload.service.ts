import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { createClient } from '@/lib/utils/supabase/server';

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
  const supabase = await createClient();

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
    return {
      success: false,
      error: error.message
    }
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
): Promise<{ success: boolean, error?: string }> {
  const supabase = createClientComponentClient<Database>();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  return {
    success: true,
  } 
}