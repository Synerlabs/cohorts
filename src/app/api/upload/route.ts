import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || 'form-uploads';
    const folder = (formData.get("folder") as string) || 'files';
    const fieldId = formData.get("fieldId") as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file provided"
      }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Generate a unique file name to avoid collisions
    const timestamp = new Date().getTime();
    const uniqueFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Get file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        fieldId
      }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    // Return the success response
    return NextResponse.json({
      success: true,
      fieldId,
      fileInfo: {
        path: data.path,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to upload file"
    }, { status: 500 });
  }
} 