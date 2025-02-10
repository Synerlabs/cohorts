-- Add form_template_id column to membership_tiers if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'membership_tiers'
                  AND column_name = 'form_template_id') THEN
        ALTER TABLE public.membership_tiers
        ADD COLUMN form_template_id UUID REFERENCES public.form_templates(id);
    END IF;
END $$;

-- Add form_response_id to applications if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'applications'
                  AND column_name = 'form_response_id') THEN
        ALTER TABLE public.applications
        ADD COLUMN form_response_id UUID REFERENCES public.form_responses(id);
    END IF;
END $$;

-- Add new form-related activation types
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_required';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_payment';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_review';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_payment_then_review'; 