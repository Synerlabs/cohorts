-- Add form_data column to applications table
ALTER TABLE public.applications
ADD COLUMN form_data JSONB; 