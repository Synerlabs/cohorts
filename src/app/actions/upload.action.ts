"use server";

import { createClient } from '@/lib/utils/supabase/server';

type CurrentState = {
  success: boolean;
  error?: string;
  fileInfo?: {
    path: string;
    url: string;
    name: string;
    size: number;
    type: string;
  };
  fieldId?: string;
  uploadIndex?: string;
  totalUploads?: string;
} | null;

export const uploadFileAction = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  try {
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || 'form-uploads';
    const folder = (formData.get("folder") as string) || 'files';
    const fieldId = formData.get("fieldId") as string;
    const uploadIndex = formData.get("uploadIndex") as string;
    const totalUploads = formData.get("totalUploads") as string;

    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

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
        error: error.message,
        fieldId,
        uploadIndex,
        totalUploads
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      success: true,
      fieldId,
      uploadIndex,
      totalUploads,
      fileInfo: {
        path: data.path,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to upload file",
    };
  }
}; 