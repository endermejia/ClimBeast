CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email VARCHAR(255),
  avatar TEXT,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Allow if superuser / postgres / service_role OR if authenticated user is admin
  IF current_user NOT IN ('postgres', 'service_role') AND NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    u.email,
    p.avatar,
    COALESCE(p.is_admin, false) AS is_admin
  FROM public.user_profiles p
  LEFT JOIN auth.users u ON u.id = p.id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated, service_role;
