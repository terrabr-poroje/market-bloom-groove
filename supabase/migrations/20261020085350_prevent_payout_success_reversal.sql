-- Prevent a confirmed successful payout from being reverted or edited to another state.
CREATE OR REPLACE FUNCTION public.terrabar_admin_update_payout_status(
  p_transaction_id uuid,
  p_status text,
  p_reference_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
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
  IF v_tx.payout_status = 'success' AND p_status <> 'success' THEN
    RAISE EXCEPTION 'تسویه موفق قابل برگشت یا تغییر وضعیت نیست' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'success' AND v_tx.payout_status <> 'success' THEN
    PERFORM 1 FROM public.members WHERE id = v_tx.member_id FOR UPDATE;
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
      description = CASE WHEN p_status = 'success' AND v_tx.payout_status <> 'success'
        THEN description || '؛ تسویه با تأیید مدیر کل'
        ELSE description END
  WHERE id = p_transaction_id;
  RETURN p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_update_payout_status(uuid, text, text) TO authenticated;
