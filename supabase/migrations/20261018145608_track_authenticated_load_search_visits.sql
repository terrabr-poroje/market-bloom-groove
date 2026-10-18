CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  route text NOT NULL CHECK (route = '/requests'),
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visits_user_id_idx ON public.site_visits(user_id);
CREATE INDEX IF NOT EXISTS site_visits_visited_at_idx ON public.site_visits(visited_at DESC);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.site_visits FROM anon;
GRANT INSERT, SELECT ON TABLE public.site_visits TO authenticated;

DROP POLICY IF EXISTS site_visits_insert_own ON public.site_visits;
CREATE POLICY site_visits_insert_own ON public.site_visits
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    member_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = site_visits.member_id
        AND m.auth_user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS site_visits_read_main_admin ON public.site_visits;
CREATE POLICY site_visits_read_main_admin ON public.site_visits
FOR SELECT TO authenticated
USING (public.terrabar_is_main_admin());
