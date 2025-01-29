-- Remove application_id from orders table
ALTER TABLE public.orders
DROP COLUMN IF EXISTS application_id;

-- Down migration
/*
ALTER TABLE public.orders
ADD COLUMN application_id UUID;

ALTER TABLE public.orders
ADD CONSTRAINT orders_application_id_fkey
FOREIGN KEY (application_id)
REFERENCES public.applications(id)
ON DELETE CASCADE;
*/ 
