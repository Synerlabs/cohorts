-- Update existing 'paid' orders to 'completed'
UPDATE orders SET status = 'completed' WHERE status = 'paid';

-- Update order status enum to match new flow
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text,    -- Initial state or insufficient payment
    'processing'::text, -- Payment pending or suborders processing
    'completed'::text,  -- Payment complete and all suborders processed
    'failed'::text,     -- Error in processing
    'cancelled'::text   -- Order cancelled
  ]));

-- Down migration
/*
-- Revert status enum
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text,
    'paid'::text
  ]));

-- Revert completed orders back to paid
UPDATE orders SET status = 'paid' WHERE status = 'completed';
*/ 
