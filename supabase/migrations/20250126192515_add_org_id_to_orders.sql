-- Add group_id column to orders table
ALTER TABLE public.orders
ADD COLUMN group_id UUID;

-- Add foreign key constraint
ALTER TABLE public.orders
ADD CONSTRAINT orders_group_id_fkey
FOREIGN KEY (group_id)
REFERENCES public."group"(id)
ON DELETE CASCADE;
