-- Add logical delete fields to form_templates
ALTER TABLE public.form_templates
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Add index for is_deleted
CREATE INDEX idx_form_templates_is_deleted ON public.form_templates(is_deleted);