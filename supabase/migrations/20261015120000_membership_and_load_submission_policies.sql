-- PROPOSED ONLY: review before applying to production Supabase.
-- Adds the minimum authenticated self-service paths needed by the current
-- membership form and load announcement flow. This file is NOT auto-applied
-- until merged/deployed through the repository workflow.

-- A signed-in user may create only their own member profile.
DROP POLICY IF EXISTS members_insert_own_profile ON public.members;
CREATE POLICY members_insert_own_profile
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Only members with an approved supplier/bar-seller role may submit a load.
-- The submitted member_id must be the caller's own member profile.
-- Loads are created as pending and still require the existing admin review flow.
DROP POLICY IF EXISTS loads_insert_approved_member ON public.loads;
CREATE POLICY loads_insert_approved_member
ON public.loads
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.id = public.loads.member_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND mr.approval_status = 'approved'
      AND mr.role_code IN ('supplier', 'bar_seller')
  )
);

GRANT INSERT ON TABLE public.members TO authenticated;
GRANT INSERT ON TABLE public.loads TO authenticated;

-- Main admins need to review pending loads in the management screen.
DROP POLICY IF EXISTS loads_main_admin_review_select ON public.loads;
CREATE POLICY loads_main_admin_review_select
ON public.loads
FOR SELECT
TO authenticated
USING (public.terrabar_is_main_admin());

-- Main admins may only change load review status through this policy.
DROP POLICY IF EXISTS loads_main_admin_review_update ON public.loads;
CREATE POLICY loads_main_admin_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

GRANT INSERT ON TABLE public.member_roles TO authenticated;
GRANT UPDATE (status) ON TABLE public.loads TO authenticated;
