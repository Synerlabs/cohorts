-- Add type column to suborders table
ALTER TABLE public.suborders
ADD COLUMN type TEXT NOT NULL DEFAULT 'membership',
ADD CONSTRAINT suborders_type_check CHECK (type = ANY (ARRAY['membership'::text, 'product'::text, 'event'::text, 'promotion'::text]));

-- Down migration
/*
ALTER TABLE public.suborders
DROP COLUMN IF EXISTS type;
*/ 