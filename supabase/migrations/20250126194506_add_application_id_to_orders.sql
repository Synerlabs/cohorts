-- Add application_id column to orders table
ALTER TABLE public.orders
ADD COLUMN application_id UUID;

-- Add foreign key constraint
ALTER TABLE public.orders
ADD CONSTRAINT orders_application_id_fkey
FOREIGN KEY (application_id)
REFERENCES public.applications(id)
ON DELETE CASCADE;
