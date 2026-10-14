-- Terrabar city access and member-role foundation.
-- Mirrors the already-applied migration on Supabase project gznsxqeyhnuzglliijzz.
-- Do not apply this file again to production; this is version-control history.

CREATE TABLE IF NOT EXISTS public.cities (
  city_name text PRIMARY KEY CHECK (length(btrim(city_name)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.city_neighbors (
  city_name text NOT NULL REFERENCES public.cities(city_name) ON UPDATE CASCADE ON DELETE CASCADE,
  neighbor_city_name text NOT NULL REFERENCES public.cities(city_name) ON UPDATE CASCADE ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (city_name, neighbor_city_name),
  CHECK (city_name <> neighbor_city_name)
);

CREATE TABLE IF NOT EXISTS public.admin_user_cities (
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  city_name text NOT NULL REFERENCES public.cities(city_name) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_user_id, city_name)
);

CREATE TABLE IF NOT EXISTS public.member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role_code text NOT NULL CHECK (
    role_code IN ('supplier', 'bar_seller', 'buyer', 'special_buyer', 'professional_buyer')
  ),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, role_code),
  CHECK (
    ((approval_status = 'approved') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR approval_status <> 'approved'
  )
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_neighbors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cities_read_active_authenticated ON public.cities;
CREATE POLICY cities_read_active_authenticated ON public.cities
FOR SELECT TO authenticated
USING (is_active OR public.terrabar_is_main_admin());

DROP POLICY IF EXISTS cities_main_admin_manage ON public.cities;
CREATE POLICY cities_main_admin_manage ON public.cities
FOR ALL TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS city_neighbors_read_authenticated ON public.city_neighbors;
CREATE POLICY city_neighbors_read_authenticated ON public.city_neighbors
FOR SELECT TO authenticated
USING (is_enabled OR public.terrabar_is_main_admin());

DROP POLICY IF EXISTS city_neighbors_main_admin_manage ON public.city_neighbors;
CREATE POLICY city_neighbors_main_admin_manage ON public.city_neighbors
FOR ALL TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS admin_user_cities_read_own_or_main_admin ON public.admin_user_cities;
CREATE POLICY admin_user_cities_read_own_or_main_admin ON public.admin_user_cities
FOR SELECT TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = admin_user_cities.admin_user_id
      AND au.auth_user_id = (SELECT auth.uid())
      AND au.is_active = true
      AND au.admin_role = 'city_manager'
  )
);

DROP POLICY IF EXISTS admin_user_cities_main_admin_manage ON public.admin_user_cities;
CREATE POLICY admin_user_cities_main_admin_manage ON public.admin_user_cities
FOR ALL TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS member_roles_read_self_or_admin ON public.member_roles;
CREATE POLICY member_roles_read_self_or_admin ON public.member_roles
FOR SELECT TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_roles.member_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS member_roles_submit_pending_self ON public.member_roles;
CREATE POLICY member_roles_submit_pending_self ON public.member_roles
FOR INSERT TO authenticated
WITH CHECK (
  approval_status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_roles.member_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS member_roles_main_admin_update ON public.member_roles;
CREATE POLICY member_roles_main_admin_update ON public.member_roles
FOR UPDATE TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS member_roles_main_admin_delete ON public.member_roles;
CREATE POLICY member_roles_main_admin_delete ON public.member_roles
FOR DELETE TO authenticated
USING (public.terrabar_is_main_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.cities, public.city_neighbors, public.admin_user_cities, public.member_roles
TO authenticated;
