-- Step 1: Create enums (can be dropped if needed)
create type storage_provider_type as enum ('google-drive', 'blob-storage');
create type manual_payment_status as enum ('pending', 'approved', 'rejected');

-- Step 2: Create storage settings table
create table if not exists org_storage_settings (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid not null references "group"(id) on delete cascade,
    provider_type storage_provider_type not null default 'google-drive',  -- safe default
    credentials jsonb not null default '{}',
    settings jsonb not null default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(org_id)
);

-- Step 3: Create manual payments table
create table if not exists manual_payments (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references orders(id) on delete cascade,
    amount decimal(10,2) not null,
    currency text not null,
    proof_file_id text,
    proof_url text,
    status manual_payment_status not null default 'pending',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    approved_at timestamp with time zone,
    approved_by uuid references auth.users(id)
);

-- Step 4: Enable RLS
alter table org_storage_settings enable row level security;
alter table manual_payments enable row level security;

-- Step 5: Create RLS policies for storage settings
create policy "Organization admins can manage storage settings"
    on org_storage_settings
    for all
    using (
        exists (
            select 1 from group_users
            where group_users.group_id = org_storage_settings.org_id
            and group_users.user_id = auth.uid()
            and exists (
                select 1 from user_roles
                join group_roles on group_roles.id = user_roles.group_role_id
                where user_roles.user_id = auth.uid()
                and group_roles.type = 'MEMBER'
            )
        )
    );

create policy "Organization members can view storage settings"
    on org_storage_settings
    for select
    using (
        exists (
            select 1 from group_users
            where group_users.group_id = org_storage_settings.org_id
            and group_users.user_id = auth.uid()
        )
    );

-- Step 6: Create RLS policies for manual payments
create policy "Organization admins can manage manual payments"
    on manual_payments
    for all
    using (
        exists (
            select 1 from orders o
            join products p on p.id = o.product_id
            join group_users gu on gu.group_id = p.group_id
            where o.id = manual_payments.order_id
            and gu.user_id = auth.uid()
            and exists (
                select 1 from user_roles
                join group_roles on group_roles.id = user_roles.group_role_id
                where user_roles.user_id = auth.uid()
                and group_roles.type = 'MEMBER'
            )
        )
    );

create policy "Users can view their own manual payments"
    on manual_payments
    for select
    using (
        exists (
            select 1 from orders
            where orders.id = manual_payments.order_id
            and orders.user_id = auth.uid()
        )
    );

create policy "Users can create their own manual payments"
    on manual_payments
    for insert
    with check (
        exists (
            select 1 from orders
            where orders.id = manual_payments.order_id
            and orders.user_id = auth.uid()
        )
    );

---- Down Migration (in case we need to rollback) ----
/*
-- Remove policies
drop policy if exists "Organization admins can manage manual payments" on manual_payments;
drop policy if exists "Users can view their own manual payments" on manual_payments;
drop policy if exists "Users can create their own manual payments" on manual_payments;
drop policy if exists "Organization admins can manage storage settings" on org_storage_settings;
drop policy if exists "Organization members can view storage settings" on org_storage_settings;

-- Drop tables
drop table if exists manual_payments;
drop table if exists org_storage_settings;

-- Drop enums
drop type if exists manual_payment_status;
drop type if exists storage_provider_type;
*/
