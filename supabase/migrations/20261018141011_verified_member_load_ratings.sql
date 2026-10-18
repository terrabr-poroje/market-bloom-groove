-- Ratings may only be submitted by the buyer on a completed order.
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('member', 'load')),
  target_member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  target_load_id uuid REFERENCES public.loads(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  review_text text,
  is_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT ratings_target_matches_type CHECK (
    (target_type = 'member' AND target_member_id IS NOT NULL AND target_load_id IS NULL)
    OR (target_type = 'load' AND target_load_id IS NOT NULL AND target_member_id IS NULL)
  )
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.ratings FROM anon;
GRANT SELECT, INSERT ON TABLE public.ratings TO authenticated;

DROP POLICY IF EXISTS ratings_insert_verified_order ON public.ratings;
CREATE POLICY ratings_insert_verified_order ON public.ratings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members reviewer
    WHERE reviewer.id = ratings.reviewer_member_id
      AND reviewer.auth_user_id = (SELECT auth.uid())
  )
  AND order_id IS NOT NULL
  AND (
    (
      target_type = 'load' AND target_load_id IS NOT NULL AND target_member_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.loads l ON l.id = o.load_id
        WHERE o.id = ratings.order_id
          AND o.load_id = ratings.target_load_id
          AND o.buyer_member_id = ratings.reviewer_member_id
          AND (o.status IN ('delivered', 'received', 'completed') OR o.delivery_status = 'delivered')
          AND l.member_id = o.seller_member_id
          AND l.member_id <> ratings.reviewer_member_id
      )
    )
    OR
    (
      target_type = 'member' AND target_member_id IS NOT NULL AND target_load_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = ratings.order_id
          AND o.buyer_member_id = ratings.reviewer_member_id
          AND o.seller_member_id = ratings.target_member_id
          AND (o.status IN ('delivered', 'received', 'completed') OR o.delivery_status = 'delivered')
          AND o.seller_member_id <> o.buyer_member_id
      )
    )
  )
);

DROP POLICY IF EXISTS ratings_read_own ON public.ratings;
CREATE POLICY ratings_read_own ON public.ratings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members reviewer
    WHERE reviewer.id = ratings.reviewer_member_id
      AND reviewer.auth_user_id = (SELECT auth.uid())
  )
);
