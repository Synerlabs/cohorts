-- Create function to approve membership
create or replace function approve_membership(
  p_membership_id uuid,
  p_is_active boolean,
  p_approved_at timestamptz
)
returns void
language plpgsql
security definer
as $$
begin
  update public.user_membership
  set 
    is_active = p_is_active,
    approved_at = p_approved_at
  where id = p_membership_id;
end;
$$; 