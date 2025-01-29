-- Drop foreign key constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_fkey;

-- Drop any indexes that might use this column
DROP INDEX IF EXISTS idx_orders_product_id;

-- Drop the product_id column
ALTER TABLE orders DROP COLUMN IF EXISTS product_id CASCADE; 
