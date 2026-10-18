ALTER TABLE public.member_roles
  ADD COLUMN IF NOT EXISTS request_note text;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'member_roles_request_note_length'
      AND conrelid = 'public.member_roles'::regclass
  ) THEN
    ALTER TABLE public.member_roles
      ADD CONSTRAINT member_roles_request_note_length
      CHECK (request_note IS NULL OR length(request_note) <= 500);
  END IF;
END
$block$;

DROP POLICY IF EXISTS member_roles_resubmit_rejected_self ON public.member_roles;
CREATE POLICY member_roles_resubmit_rejected_self ON public.member_roles
FOR UPDATE TO authenticated
USING (
  approval_status = 'rejected'
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_roles.member_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
)
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
