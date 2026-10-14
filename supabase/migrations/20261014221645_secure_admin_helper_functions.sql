-- Make admin helper functions invoker-security and limit admin_users visibility to the active user's own row.
-- This avoids exposing SECURITY DEFINER RPC endpoints while preserving the RLS checks that use these helpers.

DROP POLICY IF EXISTS admin_users_read_own_active ON public.admin_users;
CREATE POLICY admin_users_read_own_active
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  auth_user_id = (SELECT auth.uid())
  AND is_active = true
);

CREATE OR REPLACE FUNCTION public.terrabar_is_city_manager(target_city text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'city_manager'
      AND a.is_active = true
      AND a.city = target_city
  );
$function$;

CREATE OR REPLACE FUNCTION public.terrabar_is_main_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'main_admin'
      AND a.is_active = true
  );
$function$;

REVOKE ALL ON FUNCTION public.terrabar_is_city_manager(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terrabar_is_main_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terrabar_is_city_manager(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terrabar_is_main_admin() TO authenticated;
