-- Create stripe_settings table
create table if not exists stripe_settings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references "group"(id) on delete cascade,
  publishable_key text not null,
  secret_key text not null,
  webhook_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

-- Add RLS policies
alter table stripe_settings enable row level security;

-- Service role can read all settings
create policy "Service role can read stripe settings"
  on stripe_settings for select
  using (auth.role() = 'service_role');

-- Service role can update all settings
create policy "Service role can update stripe settings"
  on stripe_settings for all
  using (auth.role() = 'service_role');

-- Add trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at
  before update on stripe_settings
  for each row
  execute function update_updated_at_column();

-- Add indexes
create index stripe_settings_org_id_idx on stripe_settings(org_id);

-- Add comments
comment on table stripe_settings is 'Stores Stripe API keys and webhook secrets for organizations';
comment on column stripe_settings.org_id is 'References the organization (group) this setting belongs to';
comment on column stripe_settings.publishable_key is 'Stripe publishable key (starts with pk_)';
comment on column stripe_settings.secret_key is 'Stripe secret key (starts with sk_)';
comment on column stripe_settings.webhook_secret is 'Stripe webhook signing secret (starts with whsec_)';
