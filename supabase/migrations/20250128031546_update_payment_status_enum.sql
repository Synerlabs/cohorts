-- Update payment status enum
ALTER TYPE payment_status RENAME TO payment_status_old;
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'rejected');

-- First remove the default
ALTER TABLE payments ALTER COLUMN status DROP DEFAULT;

-- Update existing payments table to use new enum
ALTER TABLE payments 
  ALTER COLUMN status TYPE payment_status 
  USING (CASE 
    WHEN status::text = 'approved' THEN 'paid'::payment_status 
    ELSE status::text::payment_status 
  END);

-- Add back the default with new type
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending'::payment_status;

-- Drop old enum
DROP TYPE payment_status_old;

-- Down migration
/*
ALTER TYPE payment_status RENAME TO payment_status_old;
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE payments ALTER COLUMN status DROP DEFAULT;

ALTER TABLE payments 
  ALTER COLUMN status TYPE payment_status 
  USING (CASE 
    WHEN status::text = 'paid' THEN 'approved'::payment_status 
    ELSE status::text::payment_status 
  END);

ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending'::payment_status;

DROP TYPE payment_status_old;
*/

