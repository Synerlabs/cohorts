-- Drop any views that depend on the column
DROP VIEW IF EXISTS order_details;
DROP VIEW IF EXISTS order_summaries;

-- Drop any policies that might reference the column
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON orders;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON orders;

-- Recreate necessary policies
CREATE POLICY "Enable read access for authenticated users"
ON orders FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for authenticated users"
ON orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for authenticated users"
ON orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id); 