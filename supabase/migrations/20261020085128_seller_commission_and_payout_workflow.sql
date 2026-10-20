-- Terrabar seller finance: 5% commission, 95% net credit, auditable payouts.
-- Non-destructive: extends the existing finance ledger and keeps all existing records.

ALTER TABLE public.seller_financial_transactions
  DROP CONSTRAINT IF EXISTS seller_financial_transactions_transaction_type_check;
ALTER TABLE public.seller_financial_transactions
  ADD CONSTRAINT seller_financial_transactions_transaction_type_check
  CHECK (transaction_type IN ('receipt', 'commission', 'payout', 'adjustment'));

ALTER TABLE public.seller_financial_transactions
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS processed_by uuid,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

ALTER TABLE public.seller_financial_transactions
  DROP CONSTRAINT IF EXISTS seller_financial_transactions_payout_status_check;
ALTER TABLE public.seller_financial_transactions
  ADD CONSTRAINT seller_financial_transactions_payout_status_check
  CHECK (payout_status IN ('not_applicable', 'pending', 'in_progress', 'success', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS seller_finance_one_order_receipt_or_commission
  ON public.seller_financial_transactions(order_id, transaction_type)
  WHERE order_id IS NOT NULL AND transaction_type IN ('receipt', 'commission');

DROP POLICY IF EXISTS seller_bank_accounts_read_main_admin ON public.seller_bank_accounts;
CREATE POLICY seller_bank_accounts_read_main_admin ON public.seller_bank_accounts
  FOR SELECT TO authenticated USING (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS seller_bank_accounts_update_main_admin ON public.seller_bank_accounts;
CREATE POLICY seller_bank_accounts_update_main_admin ON public.seller_bank_accounts
  FOR UPDATE TO authenticated
  USING (public.terrabar_is_main_admin())
  WITH CHECK (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS seller_financial_transactions_read_main_admin ON public.seller_financial_transactions;
CREATE POLICY seller_financial_transactions_read_main_admin ON public.seller_financial_transactions
  FOR SELECT TO authenticated USING (public.terrabar_is_main_admin());

CREATE OR REPLACE FUNCTION public.terrabar_credit_completed_seller_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_gross numeric;
  v_commission numeric;
  v_net numeric;
BEGIN
  IF NEW.seller_member_id IS NULL
     OR lower(coalesce(NEW.payment_status, '')) <> 'paid'
     OR lower(coalesce(NEW.delivery_status, '')) <> 'delivered'
     OR lower(coalesce(NEW.status, '')) IN ('cancelled', 'canceled', 'refunded') THEN
    RETURN NEW;
  END IF;

  v_gross := coalesce(NEW.total_price, 0);
  IF v_gross <= 0 THEN
    RETURN NEW;
  END IF;

  v_commission := round(v_gross * 0.05, 2);
  v_net := v_gross - v_commission;

  INSERT INTO public.seller_financial_transactions
    (member_id, order_id, transaction_type, amount, description, reference_code, transaction_date)
  VALUES
    (NEW.seller_member_id, NEW.id, 'receipt', v_net,
     'اعتبار فروش پس از کسر ۵٪ کارمزد ترابار؛ مبلغ ناخالص: ' || v_gross::text,
     NEW.payment_reference, coalesce(NEW.delivered_at, now()))
  ON CONFLICT (order_id, transaction_type)
    WHERE order_id IS NOT NULL AND transaction_type IN ('receipt', 'commission')
    DO NOTHING;

  INSERT INTO public.seller_financial_transactions
    (member_id, order_id, transaction_type, amount, description, reference_code, transaction_date)
  VALUES
    (NEW.seller_member_id, NEW.id, 'commission', v_commission,
     'کارمزد ۵٪ ترابار از فروش ناخالص: ' || v_gross::text,
     NEW.payment_reference, coalesce(NEW.delivered_at, now()))
  ON CONFLICT (order_id, transaction_type)
    WHERE order_id IS NOT NULL AND transaction_type IN ('receipt', 'commission')
    DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.terrabar_credit_completed_seller_sale() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_terrabar_credit_completed_seller_sale ON public.orders;
CREATE TRIGGER trg_terrabar_credit_completed_seller_sale
AFTER INSERT OR UPDATE OF payment_status, delivery_status, status, total_price, seller_member_id
ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.terrabar_credit_completed_seller_sale();

CREATE OR REPLACE FUNCTION public.terrabar_admin_create_payout(
  p_member_id uuid,
  p_amount numeric,
  p_reference_code text DEFAULT NULL,
  p_description text DEFAULT 'درخواست تسویه توسط مدیر کل'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.terrabar_is_main_admin() THEN
    RAISE EXCEPTION 'دسترسی فقط برای مدیر کل مجاز است' USING ERRCODE = '42501';
  END IF;
  IF p_member_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'عضو و مبلغ معتبر الزامی است' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.seller_bank_accounts b
    WHERE b.member_id = p_member_id AND b.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'حساب بانکی عضو باید ابتدا تأیید شود' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.seller_financial_transactions
    (member_id, transaction_type, amount, description, reference_code, payout_status, processed_by)
  VALUES
    (p_member_id, 'payout', round(p_amount, 2), coalesce(nullif(trim(p_description), ''), 'تسویه توسط مدیر کل'),
     nullif(trim(p_reference_code), ''), 'pending', auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.terrabar_admin_update_payout_status(
  p_transaction_id uuid,
  p_status text,
  p_reference_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tx public.seller_financial_transactions%ROWTYPE;
  v_balance numeric;
BEGIN
  IF NOT public.terrabar_is_main_admin() THEN
    RAISE EXCEPTION 'دسترسی فقط برای مدیر کل مجاز است' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'in_progress', 'success', 'failed') THEN
    RAISE EXCEPTION 'وضعیت تسویه نامعتبر است' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_tx
  FROM public.seller_financial_transactions
  WHERE id = p_transaction_id AND transaction_type = 'payout'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'تراکنش تسویه پیدا نشد' USING ERRCODE = 'P0002';
  END IF;

  IF p_status = 'success' AND v_tx.payout_status <> 'success' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.seller_bank_accounts b
      WHERE b.member_id = v_tx.member_id AND b.verification_status = 'verified'
    ) THEN
      RAISE EXCEPTION 'حساب بانکی عضو تأیید نشده است' USING ERRCODE = '22023';
    END IF;

    SELECT coalesce(sum(
      CASE
        WHEN t.transaction_type = 'receipt' THEN t.amount
        WHEN t.transaction_type = 'payout' AND t.payout_status = 'success' AND t.id <> v_tx.id THEN -t.amount
        WHEN t.transaction_type = 'adjustment' THEN t.amount
        ELSE 0
      END
    ), 0)
    INTO v_balance
    FROM public.seller_financial_transactions t
    WHERE t.member_id = v_tx.member_id;

    IF v_balance < v_tx.amount THEN
      RAISE EXCEPTION 'موجودی قابل تسویه کافی نیست' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.seller_financial_transactions
  SET payout_status = p_status,
      reference_code = coalesce(nullif(trim(p_reference_code), ''), reference_code),
      processed_by = auth.uid(),
      processed_at = CASE WHEN p_status IN ('success', 'failed') THEN now() ELSE NULL END,
      description = CASE WHEN p_status = 'success'
        THEN description || '؛ تسویه با تأیید مدیر کل'
        ELSE description END
  WHERE id = p_transaction_id;
  RETURN p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.terrabar_credit_completed_seller_sale() IS
  'Credits seller net earnings once when an order is paid and delivered; records the 5 percent Terrabar commission separately.';
COMMENT ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) IS
  'Main-admin-only creation of a pending seller payout for a verified bank account.';
COMMENT ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) IS
  'Main-admin-only payout status update; success requires verified bank details and sufficient available ledger balance.';
