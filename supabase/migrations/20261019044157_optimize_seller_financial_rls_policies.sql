-- Preserve the existing seller-only access rules while avoiding per-row auth.uid() evaluation.
-- This is a semantics-preserving RLS performance improvement.
DROP POLICY IF EXISTS seller_bank_accounts_read_own ON public.seller_bank_accounts;
CREATE POLICY seller_bank_accounts_read_own ON public.seller_bank_accounts
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = seller_bank_accounts.member_id AND m.auth_user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS seller_bank_accounts_insert_own ON public.seller_bank_accounts;
CREATE POLICY seller_bank_accounts_insert_own ON public.seller_bank_accounts
FOR INSERT TO authenticated
WITH CHECK (
  verification_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = seller_bank_accounts.member_id AND m.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS seller_bank_accounts_update_own ON public.seller_bank_accounts;
CREATE POLICY seller_bank_accounts_update_own ON public.seller_bank_accounts
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = seller_bank_accounts.member_id AND m.auth_user_id = (SELECT auth.uid())
))
WITH CHECK (
  verification_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = seller_bank_accounts.member_id AND m.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS seller_financial_transactions_read_own ON public.seller_financial_transactions;
CREATE POLICY seller_financial_transactions_read_own ON public.seller_financial_transactions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = seller_financial_transactions.member_id AND m.auth_user_id = (SELECT auth.uid())
));
