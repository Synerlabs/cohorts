-- Add new duration-related columns to membership_tiers
ALTER TABLE public.membership_tiers
ADD COLUMN IF NOT EXISTS duration_unit text NOT NULL DEFAULT 'month'
CHECK (duration_unit IN ('month', 'year')),
ADD COLUMN IF NOT EXISTS has_fixed_dates boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fixed_start_date date,
ADD COLUMN IF NOT EXISTS fixed_end_date date,
ADD COLUMN IF NOT EXISTS is_fiscal_period boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fiscal_start_month smallint,
ADD COLUMN IF NOT EXISTS fiscal_start_day smallint;

-- Add check constraints for fixed dates and fiscal periods
ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_fixed_dates 
CHECK (
  (has_fixed_dates = false) OR 
  (has_fixed_dates = true AND fixed_start_date IS NOT NULL AND fixed_end_date IS NOT NULL)
);

ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_fiscal_period 
CHECK (
  (is_fiscal_period = false) OR 
  (is_fiscal_period = true AND fiscal_start_month IS NOT NULL AND fiscal_start_day IS NOT NULL)
);

-- Add constraints to ensure fiscal_start_month and fiscal_start_day are valid
ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_fiscal_start_month 
CHECK (fiscal_start_month IS NULL OR (fiscal_start_month >= 1 AND fiscal_start_month <= 12));

ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_fiscal_start_day 
CHECK (fiscal_start_day IS NULL OR (fiscal_start_day >= 1 AND fiscal_start_day <= 31));

-- Add comments to explain the new columns
COMMENT ON COLUMN public.membership_tiers.duration_unit IS 'Unit of duration - either "month" or "year"';
COMMENT ON COLUMN public.membership_tiers.has_fixed_dates IS 'Whether this tier has fixed start and end dates instead of relative duration';
COMMENT ON COLUMN public.membership_tiers.fixed_start_date IS 'Fixed start date for the membership, if applicable';
COMMENT ON COLUMN public.membership_tiers.fixed_end_date IS 'Fixed end date for the membership, if applicable';
COMMENT ON COLUMN public.membership_tiers.is_fiscal_period IS 'Whether this tier follows a fiscal year pattern';
COMMENT ON COLUMN public.membership_tiers.fiscal_start_month IS 'Starting month of fiscal year (1-12)';
COMMENT ON COLUMN public.membership_tiers.fiscal_start_day IS 'Starting day of fiscal year (1-31)';

-- Create a function to calculate membership end date based on tier settings
CREATE OR REPLACE FUNCTION calculate_membership_end_date(
    p_tier_id uuid,
    p_start_date date
) RETURNS date AS $$
DECLARE
    v_end_date date;
    v_duration_months int;
    v_duration_unit text;
    v_has_fixed_dates boolean;
    v_fixed_end_date date;
    v_is_fiscal_period boolean;
    v_fiscal_start_month smallint;
    v_fiscal_start_day smallint;
    v_fiscal_year int;
BEGIN
    -- Get tier settings
    SELECT 
        mt.duration_months,
        mt.duration_unit,
        mt.has_fixed_dates,
        mt.fixed_end_date,
        mt.is_fiscal_period,
        mt.fiscal_start_month,
        mt.fiscal_start_day
    INTO 
        v_duration_months,
        v_duration_unit,
        v_has_fixed_dates,
        v_fixed_end_date,
        v_is_fiscal_period,
        v_fiscal_start_month,
        v_fiscal_start_day
    FROM 
        public.membership_tiers mt
    WHERE 
        mt.product_id = p_tier_id;

    -- Case 1: Fixed dates - use the fixed end date
    IF v_has_fixed_dates THEN
        RETURN v_fixed_end_date;
    
    -- Case 2: Fiscal period - calculate the end of the fiscal year/period
    ELSIF v_is_fiscal_period THEN
        -- Get the fiscal year based on the start date
        IF (p_start_date < make_date(extract(year from p_start_date)::int, v_fiscal_start_month, v_fiscal_start_day)) THEN
            v_fiscal_year := extract(year from p_start_date)::int;
        ELSE
            v_fiscal_year := extract(year from p_start_date)::int + 1;
        END IF;
        
        -- Calculate end date based on fiscal year + duration
        IF v_duration_unit = 'year' THEN
            v_end_date := make_date(v_fiscal_year + v_duration_months - 1, v_fiscal_start_month, v_fiscal_start_day) - interval '1 day';
        ELSE -- 'month'
            v_end_date := make_date(v_fiscal_year, v_fiscal_start_month, v_fiscal_start_day) + 
                        (v_duration_months || ' months')::interval - interval '1 day';
        END IF;
        
        RETURN v_end_date;
    
    -- Case 3: Standard duration calculation
    ELSE
        IF v_duration_unit = 'year' THEN
            RETURN p_start_date + (v_duration_months || ' years')::interval;
        ELSE -- 'month'
            RETURN p_start_date + (v_duration_months || ' months')::interval;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql; 