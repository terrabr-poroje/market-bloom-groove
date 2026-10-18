CREATE TABLE IF NOT EXISTS public.rating_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES public.ratings(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rating_messages_rating_created_idx
  ON public.rating_messages(rating_id, created_at);

ALTER TABLE public.rating_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.rating_messages FROM anon;
GRANT SELECT, INSERT ON TABLE public.rating_messages TO authenticated;

DROP POLICY IF EXISTS rating_messages_read_participants ON public.rating_messages;
CREATE POLICY rating_messages_read_participants ON public.rating_messages
FOR SELECT TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.ratings r
    JOIN public.members m ON m.id = r.reviewer_member_id
    WHERE r.id = rating_messages.rating_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS rating_messages_insert_participants ON public.rating_messages;
CREATE POLICY rating_messages_insert_participants ON public.rating_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = (SELECT auth.uid())
  AND (
    public.terrabar_is_main_admin()
    OR EXISTS (
      SELECT 1 FROM public.ratings r
      JOIN public.members m ON m.id = r.reviewer_member_id
      WHERE r.id = rating_messages.rating_id
        AND m.auth_user_id = (SELECT auth.uid())
    )
  )
);
