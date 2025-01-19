-- Add duration_months column to membership_tier table
alter table "public"."membership_tier" 
    add column "duration_months" integer not null default 1 check (duration_months >= 1);

-- Add comment to explain the constraint
comment on column "public"."membership_tier"."duration_months" 
    is 'Duration of the membership in months, minimum 1 month'; 