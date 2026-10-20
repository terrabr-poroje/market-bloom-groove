-- Reserve available balance for pending/in-progress payouts and prevent overbooking.
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'عضو پیدا نشد' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.seller_bank_accounts b
    WHERE b.member_id = p_member_id AND b.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'حساب بانکی عضو باید ابتدا تأیید شود' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(sum(
    CASE
      WHEN t.transaction_type = 'receipt' THEN t.amount
      WHEN t.transaction_type = 'adjustment' THEN t.amount
      WHEN t.transaction_type = 'payout' AND t.payout_status IN ('pending', 'in_progress', 'success') THEN -t.amount
      ELSE 0
    END
  ), 0)
  INTO v_available
  FROM public.seller_financial_transactions t
  WHERE t.member_id = p_member_id;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'مبلغ تسویه از مانده قابل تسویه بیشتر است' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_admin_create_payout(uuid, numeric, text, text) TO authenticated;
