-- Create the form-uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true);

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'form-uploads'
);

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'form-uploads'
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'form-uploads'
  AND auth.uid() = owner
);
