-- Add group_id column to payments table
ALTER TABLE public.payments
ADD COLUMN group_id UUID REFERENCES public.group(id);

-- First, let's check for any payments without valid orders
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  RAISE NOTICE 'Checking for payments without valid orders:';
  FOR r IN
    SELECT p.id, p.order_id
    FROM public.payments p
    LEFT JOIN public.orders o ON p.order_id = o.id
    WHERE o.id IS NULL OR o.group_id IS NULL
  LOOP
    RAISE NOTICE 'Payment % with order_id % has no valid order or group_id', r.id, r.order_id;
  END LOOP;
END $$;

-- Update existing payments with group_id from orders
UPDATE public.payments p
SET group_id = o.group_id
FROM public.orders o
WHERE p.order_id = o.id
AND o.group_id IS NOT NULL;

-- For any remaining payments without a group_id, we'll need to handle them manually
-- For now, let's identify them
DO $$ 
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Payments still missing group_id:';
  FOR r IN
    SELECT id, order_id
    FROM public.payments
    WHERE group_id IS NULL
  LOOP
    RAISE NOTICE 'Payment % with order_id % has no group_id', r.id, r.order_id;
  END LOOP;
END $$;

-- Make group_id required only after confirming all payments have been updated
-- ALTER TABLE public.payments
-- ALTER COLUMN group_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_payments_group_id ON public.payments(group_id);

-- Down migration
/*
ALTER TABLE public.payments DROP COLUMN IF EXISTS group_id;
DROP INDEX IF EXISTS idx_payments_group_id;
*/ 
