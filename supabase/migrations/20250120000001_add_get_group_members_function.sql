-- Create a function to get group members with their profile information
create or replace function get_group_members(group_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  avatar_url text
) as $$
begin
  return query
  select 
    gu.id,
    gu.created_at,
    gu.user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.avatar_url
  from group_users gu
  join auth.users u on u.id = gu.user_id
  join profiles p on p.id = u.id
  where gu.group_id = $1;
end;
$$ language plpgsql security definer; 