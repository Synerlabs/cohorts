-- Add form_template_id column to membership_tiers
ALTER TABLE public.membership_tiers
ADD COLUMN form_template_id UUID REFERENCES public.form_templates(id);

-- Update activation_type check constraint to include form_required
ALTER TABLE public.membership_tiers
DROP CONSTRAINT IF EXISTS membership_tiers_activation_type_check;

ALTER TABLE public.membership_tiers
ADD CONSTRAINT membership_tiers_activation_type_check 
CHECK (activation_type = ANY (ARRAY[
    'automatic'::text, 
    'review_required'::text, 
    'payment_required'::text, 
    'review_then_payment'::text,
    'form_required'::text,
    'form_then_payment'::text,
    'form_then_review'::text,
    'form_then_payment_then_review'::text
])); 