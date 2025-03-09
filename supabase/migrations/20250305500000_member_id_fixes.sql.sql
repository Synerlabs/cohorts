-- Add monthly cycle columns to membership_tiers
ALTER TABLE public.membership_tiers
ADD COLUMN IF NOT EXISTS has_monthly_cycle boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_start_day smallint,
ADD COLUMN IF NOT EXISTS monthly_end_day_type text NOT NULL DEFAULT 'specific',
ADD COLUMN IF NOT EXISTS monthly_end_day smallint;

-- Add check constraints for monthly cycle fields
ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_monthly_cycle 
CHECK (
  (has_monthly_cycle = false) OR 
  (has_monthly_cycle = true AND monthly_start_day IS NOT NULL)
);

-- Add constraints to ensure monthly_start_day and monthly_end_day are valid
ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_monthly_start_day 
CHECK (monthly_start_day IS NULL OR (monthly_start_day >= 1 AND monthly_start_day <= 31));

ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_monthly_end_day 
CHECK (monthly_end_day IS NULL OR (monthly_end_day >= 1 AND monthly_end_day <= 31));

ALTER TABLE public.membership_tiers
ADD CONSTRAINT check_monthly_end_day_type
CHECK (monthly_end_day_type IN ('specific', 'last_day'));

-- Add comments to explain the new columns
COMMENT ON COLUMN public.membership_tiers.has_monthly_cycle IS 'Whether this tier uses monthly billing cycles';
COMMENT ON COLUMN public.membership_tiers.monthly_start_day IS 'Day of month when each billing cycle starts (1-31)';
COMMENT ON COLUMN public.membership_tiers.monthly_end_day_type IS 'How to determine the end day - either "specific" or "last_day"';
COMMENT ON COLUMN public.membership_tiers.monthly_end_day IS 'Specific day of month when each billing cycle ends (1-31), if applicable';

-- Update the calculate_membership_end_date function to handle monthly cycles
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
    v_has_monthly_cycle boolean;
    v_monthly_start_day smallint;
    v_monthly_end_day_type text;
    v_monthly_end_day smallint;
    v_cycle_start date;
    v_final_cycle_start date;
    v_last_day_of_month int;
BEGIN
    -- Get tier settings
    SELECT 
        mt.duration_months,
        mt.duration_unit,
        mt.has_fixed_dates,
        mt.fixed_end_date,
        mt.is_fiscal_period,
        mt.fiscal_start_month,
        mt.fiscal_start_day,
        mt.has_monthly_cycle,
        mt.monthly_start_day,
        mt.monthly_end_day_type,
        mt.monthly_end_day
    INTO 
        v_duration_months,
        v_duration_unit,
        v_has_fixed_dates,
        v_fixed_end_date,
        v_is_fiscal_period,
        v_fiscal_start_month,
        v_fiscal_start_day,
        v_has_monthly_cycle,
        v_monthly_start_day,
        v_monthly_end_day_type,
        v_monthly_end_day
    FROM 
        public.membership_tiers mt
    WHERE 
        mt.product_id = p_tier_id;

    -- Case 1: Fixed dates - use the fixed end date
    IF v_has_fixed_dates THEN
        RETURN v_fixed_end_date;
    
    -- Case 2: Fiscal period - calculate the end of the fiscal year/period
    ELSIF v_is_fiscal_period THEN
        -- Use existing fiscal period calculation logic
        IF (p_start_date < make_date(extract(year from p_start_date)::int, v_fiscal_start_month, v_fiscal_start_day)) THEN
            v_fiscal_year := extract(year from p_start_date)::int;
        ELSE
            v_fiscal_year := extract(year from p_start_date)::int + 1;
        END IF;
        
        IF v_duration_unit = 'year' THEN
            v_end_date := make_date(v_fiscal_year + v_duration_months - 1, v_fiscal_start_month, v_fiscal_start_day) - interval '1 day';
        ELSE -- 'month'
            v_end_date := make_date(v_fiscal_year, v_fiscal_start_month, v_fiscal_start_day) + 
                        (v_duration_months || ' months')::interval - interval '1 day';
        END IF;
        
        RETURN v_end_date;
    
    -- Case 3: Monthly cycle - calculate based on cycle rules
    ELSIF v_has_monthly_cycle AND v_monthly_start_day IS NOT NULL AND v_duration_unit = 'month' THEN
        -- Find first full cycle start date
        v_cycle_start := make_date(
            extract(year from p_start_date)::int,
            extract(month from p_start_date)::int,
            v_monthly_start_day
        );
        
        -- If start date is after the cycle start day in the current month,
        -- move to the next month's cycle start
        IF p_start_date > v_cycle_start THEN
            v_cycle_start := v_cycle_start + interval '1 month';
        END IF;
        
        -- Calculate the final cycle start date
        v_final_cycle_start := v_cycle_start + ((v_duration_months) || ' months')::interval;
        
        -- Calculate the end date based on the end day type
        IF v_monthly_end_day_type = 'last_day' THEN
            -- Get the last day of the final cycle month
            v_last_day_of_month := extract(day from 
                (date_trunc('month', v_final_cycle_start) + interval '1 month' - interval '1 day')
            )::int;
            
            -- Set the end date to the last day of the month
            v_end_date := make_date(
                extract(year from v_final_cycle_start)::int,
                extract(month from v_final_cycle_start)::int,
                v_last_day_of_month
            );
        ELSE -- 'specific'
            -- If no specific end day is provided, use the day before the next cycle start
            IF v_monthly_end_day IS NULL THEN
                v_end_date := v_final_cycle_start - interval '1 day';
            ELSE
                -- Use the specified end day
                v_last_day_of_month := extract(day from 
                    (date_trunc('month', v_final_cycle_start) + interval '1 month' - interval '1 day')
                )::int;
                
                -- Ensure the end day is not greater than the number of days in the month
                IF v_monthly_end_day > v_last_day_of_month THEN
                    v_end_date := make_date(
                        extract(year from v_final_cycle_start)::int,
                        extract(month from v_final_cycle_start)::int,
                        v_last_day_of_month
                    );
                ELSE
                    v_end_date := make_date(
                        extract(year from v_final_cycle_start)::int,
                        extract(month from v_final_cycle_start)::int,
                        v_monthly_end_day
                    );
                END IF;
            END IF;
        END IF;
        
        RETURN v_end_date;
    
    -- Case 4: Standard duration calculation
    ELSE
        IF v_duration_unit = 'year' THEN
            RETURN p_start_date + (v_duration_months || ' years')::interval;
        ELSE -- 'month'
            RETURN p_start_date + (v_duration_months || ' months')::interval;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql; 