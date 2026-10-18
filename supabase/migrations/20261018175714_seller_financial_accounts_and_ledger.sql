CREATE TABLE IF NOT EXISTS public.seller_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  bank_name text NOT NULL CHECK (length(trim(bank_name)) BETWEEN 2 AND 100),
  account_holder_name text NOT NULL CHECK (length(trim(account_holder_name)) BETWEEN 2 AND 160),
  iban text NOT NULL CHECK (iban ~ '^IR[0-9]{24}$'),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('receipt', 'payout', 'adjustment')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  reference_code text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_financial_transactions_member_date_idx
  ON public.seller_financial_transactions(member_id, transaction_date DESC);

ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_financial_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.seller_bank_accounts, public.seller_financial_transactions FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.seller_bank_accounts TO authenticated;
GRANT SELECT ON TABLE public.seller_financial_transactions TO authenticated;

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
