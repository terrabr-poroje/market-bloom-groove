-- Approved supplier and bar-seller memberships may publish valid loads immediately.
-- Membership approval, not a separate per-ad review, is the publication gate.
DROP POLICY IF EXISTS loads_insert_approved_member ON public.loads;
CREATE POLICY loads_insert_approved_member
ON public.loads
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.id = public.loads.member_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND mr.approval_status = 'approved'
      AND mr.role_code IN ('supplier', 'bar_seller', 'seller')
  )
  AND quantity > 0
  AND price > 0
  AND count > 0
  AND min_order_quantity > 0
  AND min_order_quantity <= count
  AND min_quantity > 0
  AND min_quantity <= quantity
);
COMMENT ON POLICY loads_insert_approved_member ON public.loads IS
'Only approved supplier/bar-seller members can publish a valid load immediately; role approval is the publication gate.';
