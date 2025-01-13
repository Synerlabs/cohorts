-- Create membership activation type enum
create type "public"."membership_activation_type" as enum (
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment'
);

-- Add activation_type column to membership table
alter table "public"."membership" 
    add column "activation_type" membership_activation_type not null 
    default 'automatic';

-- Create a check constraint to enforce payment requirement logic
alter table "public"."membership" 
    add constraint "membership_payment_activation_check" 
    check (
        (price = 0 AND activation_type in ('automatic', 'review_required')) OR 
        (price > 0 AND activation_type in ('payment_required', 'review_required', 'review_then_payment'))
    );

-- Update existing records to comply with new constraint
update "public"."membership"
set activation_type = 'payment_required'
where price > 0;

-- Add comment to explain the constraint
comment on constraint "membership_payment_activation_check" on "public"."membership" 
    is 'Ensures that paid memberships require either payment or review and free memberships cannot require payment'; 