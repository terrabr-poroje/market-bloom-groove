DROP POLICY IF EXISTS ratings_main_admin_read_all ON public.ratings;
CREATE POLICY ratings_main_admin_read_all ON public.ratings
FOR SELECT TO authenticated
USING (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS ratings_read_own ON public.ratings;
CREATE POLICY ratings_read_own ON public.ratings
FOR SELECT TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.members reviewer
    WHERE reviewer.id = ratings.reviewer_member_id
      AND reviewer.auth_user_id = (SELECT auth.uid())
  )
);
