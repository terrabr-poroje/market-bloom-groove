-- Terrabar finance hardening: shared member/admin ledger, audit trail, and payout safeguards.
GRANT INSERT ON TABLE public.audit_logs TO authenticated;
DROP POLICY IF EXISTS audit_logs_insert_main_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_main_admin
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.terrabar_is_main_admin() AND actor_member_id IS NULL);

CREATE OR REPLACE FUNCTION public.terrabar_prevent_financial_ledger_core_edits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.transaction_date IS DISTINCT FROM OLD.transaction_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'هسته تراکنش مالی قابل ویرایش نیست؛ برای اصلاح باید تراکنش اصلاحی جدید ثبت شود'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_terrabar_financial_ledger_immutable ON public.seller_financial_transactions;
CREATE TRIGGER trg_terrabar_financial_ledger_immutable
BEFORE UPDATE ON public.seller_financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.terrabar_prevent_financial_ledger_core_edits();

CREATE OR REPLACE FUNCTION public.terrabar_admin_create_payout(
  p_member_id uuid,
  p_amount numeric,
  p_reference_code text DEFAULT NULL,
  p_description text DEFAULT 'درخواست تسویه توسط مدیر کل'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id uuid;
  v_available numeric;
BEGIN
  IF NOT public.terrabar_is_main_admin() THEN
    RAISE EXCEPTION 'دسترسی فقط برای مدیر کل مجاز است' USING ERRCODE = '42501';
  END IF;
  IF p_member_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'عضو و مبلغ معتبر الزامی است' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.members WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'عضو پیدا نشد' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.seller_bank_accounts b WHERE b.member_id = p_member_id AND b.verification_status = 'verified') THEN
    RAISE EXCEPTION 'حساب بانکی عضو باید ابتدا تأیید شود' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(sum(CASE
    WHEN t.transaction_type IN ('receipt', 'adjustment') THEN t.amount
    WHEN t.transaction_type = 'payout' AND t.payout_status IN ('pending', 'in_progress', 'success') THEN -t.amount
    ELSE 0 END), 0)
  INTO v_available
  FROM public.seller_financial_transactions t WHERE t.member_id = p_member_id;

  IF round(p_amount, 2) > v_available THEN
    RAISE EXCEPTION 'مبلغ تسویه از مانده قابل تسویه بیشتر است' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.seller_financial_transactions
    (member_id, transaction_type, amount, description, reference_code, payout_status, processed_by)
  VALUES (p_member_id, 'payout', round(p_amount, 2),
    coalesce(nullif(trim(p_description), ''), 'تسویه توسط مدیر کل'),
    nullif(trim(p_reference_code), ''), 'pending', auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'seller_payout_created', 'seller_financial_transactions', v_id,
    jsonb_build_object('admin_user_id', auth.uid(), 'member_id', p_member_id, 'amount', round(p_amount,2),
      'payout_status', 'pending', 'reference_code', nullif(trim(p_reference_code), '')));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.terrabar_admin_update_payout_status(
  p_transaction_id uuid, p_status text, p_reference_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tx public.seller_financial_transactions%ROWTYPE;
  v_balance numeric;
  v_reference text;
BEGIN
  IF NOT public.terrabar_is_main_admin() THEN
    RAISE EXCEPTION 'دسترسی فقط برای مدیر کل مجاز است' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pending', 'in_progress', 'success', 'failed') THEN
    RAISE EXCEPTION 'وضعیت تسویه نامعتبر است' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_tx FROM public.seller_financial_transactions
    WHERE id = p_transaction_id AND transaction_type = 'payout' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'تراکنش تسویه پیدا نشد' USING ERRCODE = 'P0002'; END IF;
  IF v_tx.payout_status = 'success' AND p_status <> 'success' THEN
    RAISE EXCEPTION 'تسویه موفق قابل برگشت یا تغییر وضعیت نیست' USING ERRCODE = '22023';
  END IF;
  v_reference := coalesce(nullif(trim(p_reference_code), ''), v_tx.reference_code);
  IF p_status = 'success' AND nullif(trim(v_reference), '') IS NULL THEN
    RAISE EXCEPTION 'برای تأیید واریز موفق، شناسه پیگیری بانکی یا شماره رسید الزامی است' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'success' AND v_tx.payout_status <> 'success' THEN
    PERFORM 1 FROM public.members WHERE id = v_tx.member_id FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM public.seller_bank_accounts b WHERE b.member_id = v_tx.member_id AND b.verification_status = 'verified') THEN
      RAISE EXCEPTION 'حساب بانکی عضو تأیید نشده است' USING ERRCODE = '22023';
    END IF;
    SELECT coalesce(sum(CASE
      WHEN t.transaction_type IN ('receipt', 'adjustment') THEN t.amount
      WHEN t.transaction_type = 'payout' AND t.payout_status IN ('pending', 'in_progress', 'success') AND t.id <> v_tx.id THEN -t.amount
      ELSE 0 END), 0)
    INTO v_balance FROM public.seller_financial_transactions t WHERE t.member_id = v_tx.member_id;
    IF v_balance < v_tx.amount THEN
      RAISE EXCEPTION 'موجودی قابل تسویه کافی نیست؛ تسویه‌های در انتظار نیز از مانده رزرو می‌شوند' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.seller_financial_transactions
  SET payout_status = p_status,
      reference_code = v_reference,
      processed_by = auth.uid(),
      processed_at = CASE WHEN p_status IN ('success', 'failed') THEN now() ELSE NULL END,
      description = CASE WHEN p_status = 'success' AND v_tx.payout_status <> 'success'
        THEN description || '؛ تسویه با تأیید مدیر کل' ELSE description END
  WHERE id = p_transaction_id;

  INSERT INTO public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'seller_payout_status_changed', 'seller_financial_transactions', p_transaction_id,
    jsonb_build_object('admin_user_id', auth.uid(), 'member_id', v_tx.member_id, 'amount', v_tx.amount,
      'old_status', v_tx.payout_status, 'new_status', p_status, 'reference_code', v_reference));
  RETURN p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) TO authenticated;

COMMENT ON COLUMN public.orders.payment_provider IS
  'Provider identifier for future flexible gateway integration; never treat client-submitted payment status as proof of payment.';
COMMENT ON TABLE public.seller_financial_transactions IS
  'Member-visible financial ledger. Receipt credits, commissions, payouts and adjustments are retained as auditable entries; payout status determines reserved/settled balance.';
