-- Create payment type enum
create type payment_type as enum ('manual', 'stripe');

-- Create payment status enum
create type payment_status as enum ('pending', 'approved', 'rejected');

-- Create base payments table
create table if not exists payments (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references orders(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    type payment_type not null,
    amount decimal(10,2) not null,
    currency text not null,
    status payment_status not null default 'pending',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    approved_at timestamp with time zone,
    approved_by uuid references auth.users(id),
    -- Manual payment specific fields
    proof_file_id text,
    proof_url text,
    -- Stripe payment specific fields
    stripe_payment_intent_id text,
    stripe_client_secret text
);

-- Enable RLS
alter table payments enable row level security;

-- Create RLS policies
create policy "Organization admins can manage payments"
    on payments
    for all
    using (
        exists (
            select 1 from orders o
            join products p on p.id = o.product_id
            join group_users gu on gu.group_id = p.group_id
            where o.id = payments.order_id
            and gu.user_id = auth.uid()
            and exists (
                select 1 from user_roles
                join group_roles on group_roles.id = user_roles.group_role_id
                where user_roles.user_id = auth.uid()
                and group_roles.type = 'MEMBER'
            )
        )
    );

create policy "Users can view their own payments"
    on payments
    for select
    using (
        exists (
            select 1 from orders
            where orders.id = payments.order_id
            and orders.user_id = auth.uid()
        )
    );

create policy "Users can create their own payments"
    on payments
    for insert
    with check (
        exists (
            select 1 from orders
            where orders.id = payments.order_id
            and orders.user_id = auth.uid()
        )
    );

-- Migrate data from manual_payments to payments
insert into payments (
    id,
    order_id,
    user_id,
    type,
    amount,
    currency,
    status,
    notes,
    created_at,
    updated_at,
    approved_at,
    approved_by,
    proof_file_id,
    proof_url
)
select
    mp.id,
    mp.order_id,
    o.user_id,
    'manual'::payment_type,
    mp.amount,
    mp.currency,
    mp.status::text::payment_status,
    mp.notes,
    mp.created_at,
    mp.updated_at,
    mp.approved_at,
    mp.approved_by,
    mp.proof_file_id,
    mp.proof_url
from manual_payments mp
join orders o on o.id = mp.order_id;

-- Drop old manual_payments table
drop table if exists manual_payments;

---- Down Migration ----
/*
-- Recreate manual_payments table
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

-- Migrate data back from payments to manual_payments
insert into manual_payments
select
    id,
    order_id,
    amount,
    currency,
    proof_file_id,
    proof_url,
    status::manual_payment_status,
    notes,
    created_at,
    updated_at,
    approved_at,
    approved_by
from payments
where type = 'manual';

-- Drop payments table and type
drop table if exists payments;
drop type if exists payment_type;
*/ 