-- Create function to get distinct roles (Supabase doesn't support distinct in JS client properly)
CREATE OR REPLACE FUNCTION get_roles_list()
RETURNS TABLE (role text)
LANGUAGE sql
AS $$
  SELECT DISTINCT role FROM role_permissions WHERE role IS NOT NULL AND role != '';
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_roles_list() TO authenticated, anon;

