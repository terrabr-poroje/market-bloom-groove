


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_storefront_member"("p_member_id" "uuid") RETURNS TABLE("id" "uuid", "full_name" "text", "city" "text", "role" "text", "verification_status" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    m.id,
    m.full_name,
    m.city,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.member_roles mr
        WHERE mr.member_id = m.id AND mr.approval_status = 'approved'
          AND lower(mr.role_code) = 'supplier'
      ) THEN 'supplier'
      ELSE 'seller'
    END AS role,
    m.verification_status
  FROM public.members m
  WHERE m.id = p_member_id
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      WHERE mr.member_id = m.id
        AND mr.approval_status = 'approved'
        AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
    );
$$;


ALTER FUNCTION "public"."get_storefront_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_admin_archive_load"("p_load_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare v_city text; v_status text;
begin
  select city, status into v_city, v_status from public.loads where id = p_load_id and archived_at is null for update;
  if not found then raise exception 'بار فعال پیدا نشد'; end if;
  if not public.terrabar_is_main_admin() and not exists (
    select 1 from public.admin_users au
    left join public.admin_user_cities auc on auc.admin_user_id = au.id
    where au.auth_user_id = auth.uid() and au.admin_role = 'city_manager' and au.is_active
      and (auc.city_name = v_city or au.city = v_city)
  ) then raise exception 'دسترسی به این شهر مجاز نیست'; end if;
  update public.loads set archived_previous_status = v_status, status = 'archived', archived_at = now(), archived_by = auth.uid() where id = p_load_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'archive', 'load', p_load_id, jsonb_build_object('city', v_city, 'previous_status', v_status));
end; $$;


ALTER FUNCTION "public"."terrabar_admin_archive_load"("p_load_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_admin_archive_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare v_city text;
begin
  select city into v_city from public.members where id = p_member_id and is_archived = false for update;
  if not found then raise exception 'عضو فعال پیدا نشد'; end if;
  if not public.terrabar_is_main_admin() and not exists (
    select 1 from public.admin_users au
    left join public.admin_user_cities auc on auc.admin_user_id = au.id
    where au.auth_user_id = auth.uid() and au.admin_role = 'city_manager' and au.is_active
      and (auc.city_name = v_city or au.city = v_city)
  ) then raise exception 'دسترسی به این شهر مجاز نیست'; end if;
  update public.members set is_archived = true, archived_at = now(), archived_by = auth.uid() where id = p_member_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'archive', 'member', p_member_id, jsonb_build_object('city', v_city));
end; $$;


ALTER FUNCTION "public"."terrabar_admin_archive_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT 'درخواست تسویه توسط مدیر کل'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
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
      WHEN t.transaction_type IN ('receipt', 'adjustment') THEN t.amount
      WHEN t.transaction_type = 'payout' AND t.payout_status IN ('pending', 'in_progress', 'success') THEN -t.amount
      ELSE 0
    END
  ), 0)
  INTO v_available
  FROM public.seller_financial_transactions t
  WHERE t.member_id = p_member_id;

  IF round(p_amount, 2) > v_available THEN
    RAISE EXCEPTION 'مبلغ تسویه از مانده قابل تسویه بیشتر است' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.seller_financial_transactions
    (member_id, transaction_type, amount, description, reference_code, payout_status, processed_by)
  VALUES
    (p_member_id, 'payout', round(p_amount, 2), coalesce(nullif(trim(p_description), ''), 'تسویه توسط مدیر کل'),
     nullif(trim(p_reference_code), ''), 'pending', auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'seller_payout_created', 'seller_financial_transactions', v_id,
    jsonb_build_object('admin_user_id', auth.uid(), 'member_id', p_member_id, 'amount', round(p_amount,2),
      'payout_status', 'pending', 'reference_code', nullif(trim(p_reference_code), '')));

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text", "p_description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text", "p_description" "text") IS 'Main-admin-only creation of a pending seller payout for a verified bank account.';



CREATE OR REPLACE FUNCTION "public"."terrabar_admin_restore_load"("p_load_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare v_city text;
begin
  select city into v_city from public.loads where id = p_load_id and archived_at is not null for update;
  if not found then raise exception 'بار بایگانی‌شده پیدا نشد'; end if;
  if not public.terrabar_is_main_admin() then raise exception 'بازگردانی بارها فقط با دسترسی مدیر کل مجاز است'; end if;
  update public.loads set status = coalesce(nullif(archived_previous_status, 'archived'), 'active'),
    archived_previous_status = null, archived_at = null, archived_by = null where id = p_load_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'restore', 'load', p_load_id, jsonb_build_object('city', v_city));
end; $$;


ALTER FUNCTION "public"."terrabar_admin_restore_load"("p_load_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_admin_restore_member"("p_member_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare v_city text;
begin
  select city into v_city from public.members where id = p_member_id and is_archived = true for update;
  if not found then raise exception 'عضو بایگانی‌شده پیدا نشد'; end if;
  if not public.terrabar_is_main_admin() then raise exception 'بازگردانی اعضا فقط با دسترسی مدیر کل مجاز است'; end if;
  update public.members set is_archived = false, archived_at = null, archived_by = null where id = p_member_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'restore', 'member', p_member_id, jsonb_build_object('city', v_city));
end; $$;


ALTER FUNCTION "public"."terrabar_admin_restore_member"("p_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
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

  v_reference := coalesce(nullif(trim(p_reference_code), ''), v_tx.reference_code);
  IF p_status = 'success' AND nullif(trim(v_reference), '') IS NULL THEN
    RAISE EXCEPTION 'برای تأیید واریز موفق، شناسه پیگیری بانکی یا شماره رسید الزامی است' USING ERRCODE = '22023';
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
        WHEN t.transaction_type IN ('receipt', 'adjustment') THEN t.amount
        WHEN t.transaction_type = 'payout' AND t.payout_status IN ('pending', 'in_progress', 'success')
             AND t.id <> v_tx.id THEN -t.amount
        ELSE 0
      END
    ), 0)
    INTO v_balance
    FROM public.seller_financial_transactions t
    WHERE t.member_id = v_tx.member_id;

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
        THEN description || '؛ تسویه با تأیید مدیر کل'
        ELSE description END
  WHERE id = p_transaction_id;

  INSERT INTO public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'seller_payout_status_changed', 'seller_financial_transactions', p_transaction_id,
    jsonb_build_object('admin_user_id', auth.uid(), 'member_id', v_tx.member_id, 'amount', v_tx.amount,
      'old_status', v_tx.payout_status, 'new_status', p_status, 'reference_code', v_reference));

  RETURN p_transaction_id;
END;
$$;


ALTER FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text") IS 'Main-admin-only payout status update; success requires verified bank details and sufficient available ledger balance.';



CREATE OR REPLACE FUNCTION "public"."terrabar_credit_completed_seller_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."terrabar_credit_completed_seller_sale"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."terrabar_credit_completed_seller_sale"() IS 'Credits seller net earnings once when an order is paid and delivered; records the 5 percent Terrabar commission separately.';



CREATE OR REPLACE FUNCTION "public"."terrabar_enforce_professional_market_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  actor uuid := auth.uid();
  buyer_city text;
  buyer_base_role text;
  seller_city text;
  has_professional_role boolean;
  has_supplier_role boolean;
  has_bar_seller_role boolean;
  has_special_buyer_role boolean;
  has_buyer_role boolean;
  load_sale_type text;
BEGIN
  IF actor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_TABLE_NAME = 'loads' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF TG_OP = 'UPDATE'
       AND NEW.member_id IS NOT DISTINCT FROM OLD.member_id
       AND NEW.owner_member_id IS NOT DISTINCT FROM OLD.owner_member_id
       AND NEW.sale_type IS NOT DISTINCT FROM OLD.sale_type
       AND NEW.seller_type IS NOT DISTINCT FROM OLD.seller_type
       AND NEW.role IS NOT DISTINCT FROM OLD.role THEN RETURN NEW; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.members m WHERE m.id = COALESCE(NEW.owner_member_id, NEW.member_id) AND m.auth_user_id = actor)
      THEN RAISE EXCEPTION 'You may only publish loads for your own member account'; END IF;
    SELECT bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code IN ('bar_seller', 'seller')), bool_or(mr.role_code IN ('supplier', 'bar_seller', 'seller'))
      INTO has_supplier_role, has_bar_seller_role, has_professional_role
    FROM public.members m JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.id = COALESCE(NEW.owner_member_id, NEW.member_id) AND m.auth_user_id = actor AND mr.approval_status = 'approved';
    IF NOT COALESCE(has_professional_role, false) THEN RAISE EXCEPTION 'Posting loads requires approved supplier or bar-seller membership'; END IF;
    IF COALESCE(has_supplier_role, false) AND NEW.sale_type IS DISTINCT FROM 'professional' THEN
      RAISE EXCEPTION 'Suppliers may only publish in the professional sale section';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'load_price_tiers' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.loads l JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id) WHERE l.id = NEW.load_id AND m.auth_user_id = actor)
      THEN RAISE EXCEPTION 'You may only manage price tiers for your own loads'; END IF;
    SELECT bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code IN ('bar_seller', 'seller'))
      INTO has_supplier_role, has_bar_seller_role
    FROM public.loads l JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id)
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE l.id = NEW.load_id AND m.auth_user_id = actor AND mr.approval_status = 'approved';
    IF COALESCE(has_supplier_role, false) AND NEW.sale_type NOT IN ('professional', 'pro') THEN RAISE EXCEPTION 'Suppliers may only create professional price tiers'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    IF NEW.buyer_member_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.members m WHERE m.id = NEW.buyer_member_id AND m.auth_user_id = actor)
      THEN RAISE EXCEPTION 'Orders must belong to the signed-in buyer member'; END IF;
    SELECT m.city, m.role, bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code IN ('bar_seller', 'seller')), bool_or(mr.role_code IN ('special_buyer', 'buyer_special')),
      bool_or(m.role = 'buyer' OR mr.role_code IN ('buyer', 'ordinary_buyer', 'regular_buyer', 'special_buyer', 'buyer_special', 'professional_buyer', 'pro_buyer'))
      INTO buyer_city, buyer_base_role, has_supplier_role, has_bar_seller_role, has_special_buyer_role, has_buyer_role
    FROM public.members m LEFT JOIN public.member_roles mr ON mr.member_id = m.id AND mr.approval_status IN ('pending', 'approved')
    WHERE m.id = NEW.buyer_member_id AND m.auth_user_id = actor GROUP BY m.city, m.role;
    SELECT COALESCE(l.sale_type, 'regular'), m.city INTO load_sale_type, seller_city
    FROM public.loads l LEFT JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id)
    WHERE l.id = NEW.load_id AND l.status = 'active';
    IF load_sale_type IS NULL THEN RAISE EXCEPTION 'The selected load is not available'; END IF;
    IF load_sale_type IN ('professional', 'pro') THEN
      IF NOT (COALESCE(has_supplier_role, false) OR COALESCE(has_bar_seller_role, false)) THEN RAISE EXCEPTION 'Professional purchases are only available to registered suppliers and bar sellers'; END IF;
    ELSIF COALESCE(has_special_buyer_role, false) THEN
      IF buyer_city IS DISTINCT FROM seller_city AND NOT EXISTS (SELECT 1 FROM public.city_neighbors cn WHERE cn.is_enabled = true AND ((cn.city_name = buyer_city AND cn.neighbor_city_name = seller_city) OR (cn.city_name = seller_city AND cn.neighbor_city_name = buyer_city)))
        THEN RAISE EXCEPTION 'This load is outside the buyer allowed city range'; END IF;
    ELSE
      IF buyer_city IS DISTINCT FROM seller_city THEN RAISE EXCEPTION 'This account may only purchase within its registered city for this section'; END IF;
      -- A registered ordinary buyer is a member; buyer-role approval is not required.
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."terrabar_enforce_professional_market_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."terrabar_enforce_professional_market_access"() IS 'Professional purchases are for registered supplier/bar-seller roles without city limits. Retail, wholesale and special purchases follow city access for all members: ordinary members own city, special buyers enabled neighboring cities. Ordinary buyer membership requires no manager approval; load posting requires approved supplier/bar-seller membership. Suppliers post only professional loads; bar sellers may post professional and other permitted sections.';



CREATE OR REPLACE FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'city_manager'
      AND a.is_active = true
      AND a.city = target_city
  );
$$;


ALTER FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_is_main_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.admin_role = 'main_admin'
      AND a.is_active = true
  );
$$;


ALTER FUNCTION "public"."terrabar_is_main_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_order_pricing_valid"("p_load_id" "uuid", "p_sale_type" "text", "p_quantity" numeric, "p_price" numeric, "p_total" numeric) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.loads l
    WHERE l.id = p_load_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.load_price_tiers t
          WHERE t.load_id = l.id
            AND t.sale_type = p_sale_type
            AND p_quantity >= COALESCE(t.minimum_packages, 1)
            AND p_quantity * COALESCE(l.package_weight, GREATEST(1, ROUND(l.quantity / NULLIF(l.count, 0)))) >= COALESCE(t.min_quantity, 0)
            AND (t.max_quantity IS NULL OR p_quantity * COALESCE(l.package_weight, GREATEST(1, ROUND(l.quantity / NULLIF(l.count, 0)))) <= t.max_quantity)
            AND p_price = t.unit_price
            AND p_total = p_quantity * COALESCE(l.package_weight, GREATEST(1, ROUND(l.quantity / NULLIF(l.count, 0)))) * t.unit_price
        )
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.load_price_tiers t
            WHERE t.load_id = l.id AND t.sale_type = p_sale_type
          )
          AND p_quantity >= COALESCE(l.min_order_quantity, 1)
          AND p_price = l.price
          AND p_total = p_quantity * COALESCE(l.package_weight, GREATEST(1, ROUND(l.quantity / NULLIF(l.count, 0)))) * l.price
        )
      )
  );
$$;


ALTER FUNCTION "public"."terrabar_order_pricing_valid"("p_load_id" "uuid", "p_sale_type" "text", "p_quantity" numeric, "p_price" numeric, "p_total" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_recovery_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_recovery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_user_cities" (
    "admin_user_id" "uuid" NOT NULL,
    "city_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_user_cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "admin_role" "text" NOT NULL,
    "city" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "login_username" "text",
    "display_name" "text",
    CONSTRAINT "admin_city_rule" CHECK (((("admin_role" = 'main_admin'::"text") AND ("city" IS NULL)) OR (("admin_role" = 'city_manager'::"text") AND ("city" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "city")) > 0)))),
    CONSTRAINT "admin_users_admin_role_check" CHECK (("admin_role" = ANY (ARRAY['main_admin'::"text", 'city_manager'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_member_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cities" (
    "city_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cities_city_name_check" CHECK (("length"("btrim"("city_name")) > 0))
);


ALTER TABLE "public"."cities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."city_neighbors" (
    "city_name" "text" NOT NULL,
    "neighbor_city_name" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "city_neighbors_check" CHECK (("city_name" <> "neighbor_city_name"))
);


ALTER TABLE "public"."city_neighbors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."load_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."load_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."load_price_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "min_quantity" numeric(14,3) DEFAULT 0 NOT NULL,
    "max_quantity" numeric(14,3),
    "unit_price" numeric(14,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sale_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    "minimum_packages" numeric DEFAULT 1 NOT NULL,
    CONSTRAINT "load_price_tiers_minimum_packages_check" CHECK (("minimum_packages" >= (1)::numeric)),
    CONSTRAINT "load_price_tiers_sale_type_check" CHECK (("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"]))),
    CONSTRAINT "valid_quantity_range" CHECK ((("min_quantity" >= (0)::numeric) AND (("max_quantity" IS NULL) OR ("max_quantity" >= "min_quantity")))),
    CONSTRAINT "valid_unit_price" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."load_price_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "city" "text" NOT NULL,
    "role" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "origin" "text" NOT NULL,
    "engine" "text",
    "source_market" "text",
    "price" numeric NOT NULL,
    "price_unit" "text" NOT NULL,
    "quality" "text",
    "description" "text",
    "ready_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_phone" "text",
    "min_quantity" numeric,
    "unit" "text" NOT NULL,
    "owner_member_id" "uuid",
    "seller_type" "text",
    "source_region" "text",
    "sale_type" "text",
    "min_order_quantity" numeric(14,3),
    "count" numeric,
    "package_type" "text" DEFAULT 'کارتن'::"text" NOT NULL,
    "package_weight" numeric DEFAULT 10 NOT NULL,
    "ad_start_date" "date",
    "ad_end_date" "date",
    "response_start_time" time without time zone,
    "response_end_time" time without time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archived_previous_status" "text",
    CONSTRAINT "loads_ad_date_range_valid" CHECK ((("ad_start_date" IS NULL) OR ("ad_end_date" IS NULL) OR ("ad_end_date" >= "ad_start_date"))),
    CONSTRAINT "loads_response_time_range_valid" CHECK ((("response_start_time" IS NULL) OR ("response_end_time" IS NULL) OR ("response_end_time" > "response_start_time")))
);


ALTER TABLE "public"."loads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_note" "text",
    CONSTRAINT "member_roles_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "member_roles_check" CHECK (((("approval_status" = 'approved'::"text") AND ("approved_by" IS NOT NULL) AND ("approved_at" IS NOT NULL)) OR ("approval_status" <> 'approved'::"text"))),
    CONSTRAINT "member_roles_request_note_length" CHECK ((("request_note" IS NULL) OR ("length"("request_note") <= 500))),
    CONSTRAINT "member_roles_role_code_check" CHECK (("role_code" = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'buyer'::"text", 'special_buyer'::"text", 'professional_buyer'::"text"])))
);


ALTER TABLE "public"."member_roles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."member_roles"."request_note" IS 'Optional note submitted by the member with a new or resubmitted role request; visible to authorized membership reviewers.';



CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "city" "text" NOT NULL,
    "role" "text" NOT NULL,
    "products" "text",
    "verification_status" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid"
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "language" "text" DEFAULT 'fa'::"text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_invoice_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."orders_invoice_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "load_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "customer_city" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "price" numeric,
    "total_price" numeric,
    "delivery_address" "text",
    "delivery_type" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buyer_member_id" "uuid",
    "seller_member_id" "uuid",
    "customer_email" "text",
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "paid_at" timestamp with time zone,
    "delivery_status" "text" DEFAULT 'awaiting_payment'::"text" NOT NULL,
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "delivery_confirmation_method" "text",
    "delivery_confirmed_by" "uuid",
    "sale_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    "invoice_number" bigint DEFAULT "nextval"('"public"."orders_invoice_number_seq"'::"regclass") NOT NULL,
    CONSTRAINT "orders_sale_type_check" CHECK (("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."payment_status" IS 'Payment lifecycle: unpaid, pending, paid, failed, refunded. Only trusted server/webhook may mark paid.';



COMMENT ON COLUMN "public"."orders"."payment_provider" IS 'Provider identifier for future flexible gateway integration; never treat client-submitted payment status as proof of payment.';



COMMENT ON COLUMN "public"."orders"."payment_reference" IS 'Payment gateway transaction reference; never accepted from a browser client as proof of payment.';



COMMENT ON COLUMN "public"."orders"."delivery_status" IS 'Delivery lifecycle: awaiting_payment, awaiting_dispatch, shipped, delivered, disputed. Updated only by trusted workflow.';



COMMENT ON COLUMN "public"."orders"."invoice_number" IS 'Unique stable invoice/tracking number generated by the database.';



CREATE TABLE IF NOT EXISTS "public"."outgoing_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "recipient_id" "text",
    "recipient_phone" "text",
    "message_text" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "external_message_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."outgoing_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_financial_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_type" "text" NOT NULL,
    "entry_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'IRR'::"text" NOT NULL,
    "order_id" "uuid",
    "member_id" "uuid",
    "provider" "text",
    "external_reference" "text",
    "idempotency_key" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "occurred_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "platform_financial_ledger_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "platform_financial_ledger_currency_check" CHECK (("currency" = ANY (ARRAY['IRR'::"text", 'IRT'::"text"]))),
    CONSTRAINT "platform_financial_ledger_entry_status_check" CHECK (("entry_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'failed'::"text", 'reversed'::"text"]))),
    CONSTRAINT "platform_financial_ledger_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['sale_gross'::"text", 'platform_commission'::"text", 'gateway_fee'::"text", 'refund'::"text", 'seller_payout'::"text", 'gateway_receipt'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."platform_financial_ledger" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_financial_ledger" IS 'Admin-only platform financial ledger for provider-independent gateway reconciliation. Entries are not proof of payment unless confirmed by trusted server-side verification.';



COMMENT ON COLUMN "public"."platform_financial_ledger"."external_reference" IS 'Unique gateway/bank transaction reference per provider; do not accept as payment proof from browser input.';



COMMENT ON COLUMN "public"."platform_financial_ledger"."idempotency_key" IS 'Unique idempotency key to prevent duplicate financial event ingestion.';



CREATE SEQUENCE IF NOT EXISTS "public"."purchase_requests_request_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_requests_request_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_member_id" "uuid",
    "product_type" "text" NOT NULL,
    "quantity" numeric(14,3) NOT NULL,
    "quantity_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "destination_city" "text",
    "quality_requirements" "text",
    "needed_by" "date",
    "notes" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "load_id" "uuid",
    "request_number" bigint DEFAULT "nextval"('"public"."purchase_requests_request_number_seq"'::"regclass") NOT NULL
);


ALTER TABLE "public"."purchase_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."purchase_requests"."request_number" IS 'Unique stable tracking number for a multi-product purchase request, generated by the database.';



CREATE TABLE IF NOT EXISTS "public"."rating_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rating_id" "uuid" NOT NULL,
    "sender_user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rating_messages_message_check" CHECK ((("length"("btrim"("message")) >= 1) AND ("length"("btrim"("message")) <= 2000)))
);


ALTER TABLE "public"."rating_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."rating_messages" IS 'Private follow-up message thread between a buyer who submitted a rating and authorized Terrabar admins.';



CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_member_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_member_id" "uuid",
    "target_load_id" "uuid",
    "score" smallint NOT NULL,
    "review_text" "text",
    "is_visible" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    CONSTRAINT "ratings_score_check" CHECK ((("score" >= 1) AND ("score" <= 5))),
    CONSTRAINT "ratings_target_matches_type" CHECK (((("target_type" = 'member'::"text") AND ("target_member_id" IS NOT NULL) AND ("target_load_id" IS NULL)) OR (("target_type" = 'load'::"text") AND ("target_load_id" IS NOT NULL) AND ("target_member_id" IS NULL)))),
    CONSTRAINT "ratings_target_type_check" CHECK (("target_type" = ANY (ARRAY['member'::"text", 'load'::"text"])))
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seller_bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "bank_name" "text" NOT NULL,
    "account_holder_name" "text" NOT NULL,
    "iban" "text" NOT NULL,
    "verification_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seller_bank_accounts_account_holder_name_check" CHECK ((("length"(TRIM(BOTH FROM "account_holder_name")) >= 2) AND ("length"(TRIM(BOTH FROM "account_holder_name")) <= 160))),
    CONSTRAINT "seller_bank_accounts_bank_name_check" CHECK ((("length"(TRIM(BOTH FROM "bank_name")) >= 2) AND ("length"(TRIM(BOTH FROM "bank_name")) <= 100))),
    CONSTRAINT "seller_bank_accounts_iban_check" CHECK (("iban" ~ '^IR[0-9]{24}$'::"text")),
    CONSTRAINT "seller_bank_accounts_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."seller_bank_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."seller_bank_accounts" IS 'Seller bank account details; only the owning authenticated member can read or edit. Verification status is not user-editable.';



CREATE TABLE IF NOT EXISTS "public"."seller_financial_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "transaction_type" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "description" "text" NOT NULL,
    "reference_code" "text",
    "transaction_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payout_status" "text" DEFAULT 'not_applicable'::"text" NOT NULL,
    "processed_by" "uuid",
    "processed_at" timestamp with time zone,
    CONSTRAINT "seller_financial_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "seller_financial_transactions_payout_status_check" CHECK (("payout_status" = ANY (ARRAY['not_applicable'::"text", 'pending'::"text", 'in_progress'::"text", 'success'::"text", 'failed'::"text"]))),
    CONSTRAINT "seller_financial_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['receipt'::"text", 'commission'::"text", 'payout'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."seller_financial_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."seller_financial_transactions" IS 'Member-visible financial ledger. Receipt credits, commissions, payouts and adjustments are retained as auditable entries; payout status determines reserved/settled balance.';



CREATE TABLE IF NOT EXISTS "public"."site_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_id" "uuid",
    "route" "text" NOT NULL,
    "visited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_visits_route_check" CHECK (("route" = '/requests'::"text"))
);


ALTER TABLE "public"."site_visits" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."site_visit_summary" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "total_visits",
    "count"(DISTINCT "user_id") AS "unique_visitors",
    "count"(*) FILTER (WHERE ("visited_at" >= ("now"() - '24:00:00'::interval))) AS "visits_last_24_hours",
    "count"(DISTINCT "user_id") FILTER (WHERE ("visited_at" >= ("now"() - '24:00:00'::interval))) AS "visitors_last_24_hours"
   FROM "public"."site_visits";


ALTER VIEW "public"."site_visit_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "account_name" "text",
    "account_id" "text",
    "status" "text" DEFAULT 'disconnected'::"text" NOT NULL,
    "connected_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "external_user_id" "text",
    "full_name" "text",
    "phone" "text",
    "username" "text",
    "city" "text",
    "role" "text",
    "member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "sender_name" "text",
    "sender_phone" "text",
    "sender_id" "text",
    "message_text" "text",
    "message_type" "text" DEFAULT 'text'::"text",
    "external_message_id" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "content" "text",
    "media_url" "text",
    "external_post_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."social_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "event_type" "text",
    "external_event_id" "text",
    "payload" "jsonb",
    "processed" boolean DEFAULT false NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_recovery_codes"
    ADD CONSTRAINT "admin_recovery_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_pkey" PRIMARY KEY ("admin_user_id", "city_name");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cities"
    ADD CONSTRAINT "cities_pkey" PRIMARY KEY ("city_name");



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_pkey" PRIMARY KEY ("city_name", "neighbor_city_name");



ALTER TABLE ONLY "public"."load_images"
    ADD CONSTRAINT "load_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."load_price_tiers"
    ADD CONSTRAINT "load_price_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loads"
    ADD CONSTRAINT "loads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_member_id_role_code_key" UNIQUE ("member_id", "role_code");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outgoing_messages"
    ADD CONSTRAINT "outgoing_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_provider_reference_unique" UNIQUE ("provider", "external_reference");



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rating_messages"
    ADD CONSTRAINT "rating_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_bank_accounts"
    ADD CONSTRAINT "seller_bank_accounts_member_id_key" UNIQUE ("member_id");



ALTER TABLE ONLY "public"."seller_bank_accounts"
    ADD CONSTRAINT "seller_bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_financial_transactions"
    ADD CONSTRAINT "seller_financial_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_contacts"
    ADD CONSTRAINT "social_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_messages"
    ADD CONSTRAINT "social_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "admin_users_login_username_unique" ON "public"."admin_users" USING "btree" ("lower"("login_username")) WHERE ("login_username" IS NOT NULL);



CREATE INDEX "idx_admin_user_cities_admin_city" ON "public"."admin_user_cities" USING "btree" ("admin_user_id", "city_name");



CREATE INDEX "idx_admin_user_cities_city_name" ON "public"."admin_user_cities" USING "btree" ("city_name");



CREATE INDEX "idx_admin_users_created_by" ON "public"."admin_users" USING "btree" ("created_by");



CREATE INDEX "idx_audit_logs_created" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_city_neighbors_enabled_pair" ON "public"."city_neighbors" USING "btree" ("city_name", "neighbor_city_name") WHERE ("is_enabled" = true);



CREATE INDEX "idx_city_neighbors_enabled_reverse_pair" ON "public"."city_neighbors" USING "btree" ("neighbor_city_name", "city_name") WHERE ("is_enabled" = true);



CREATE INDEX "idx_city_neighbors_neighbor_city_name" ON "public"."city_neighbors" USING "btree" ("neighbor_city_name");



CREATE INDEX "idx_load_images_load" ON "public"."load_images" USING "btree" ("load_id");



CREATE INDEX "idx_load_price_tiers_load_id" ON "public"."load_price_tiers" USING "btree" ("load_id");



CREATE INDEX "idx_loads_active_created" ON "public"."loads" USING "btree" ("created_at" DESC) WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_loads_city" ON "public"."loads" USING "btree" ("city");



CREATE INDEX "idx_loads_city_product" ON "public"."loads" USING "btree" ("city", "product_type");



CREATE INDEX "idx_loads_member_id" ON "public"."loads" USING "btree" ("member_id");



CREATE INDEX "idx_loads_owner" ON "public"."loads" USING "btree" ("owner_member_id");



CREATE INDEX "idx_loads_product" ON "public"."loads" USING "btree" ("product_type");



CREATE INDEX "idx_loads_status" ON "public"."loads" USING "btree" ("status");



CREATE INDEX "idx_member_roles_approved_by" ON "public"."member_roles" USING "btree" ("approved_by");



CREATE INDEX "idx_member_roles_member_approval_role" ON "public"."member_roles" USING "btree" ("member_id", "approval_status", "role_code");



CREATE INDEX "idx_members_phone" ON "public"."members" USING "btree" ("phone");



CREATE INDEX "idx_orders_buyer_created" ON "public"."orders" USING "btree" ("buyer_member_id", "created_at" DESC);



CREATE INDEX "idx_orders_buyer_member_id" ON "public"."orders" USING "btree" ("buyer_member_id");



CREATE INDEX "idx_orders_load_id" ON "public"."orders" USING "btree" ("load_id");



CREATE INDEX "idx_orders_seller_created" ON "public"."orders" USING "btree" ("seller_member_id", "created_at" DESC);



CREATE INDEX "idx_orders_seller_member_id" ON "public"."orders" USING "btree" ("seller_member_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_outgoing_messages_connection_id" ON "public"."outgoing_messages" USING "btree" ("connection_id");



CREATE INDEX "idx_purchase_requests_buyer" ON "public"."purchase_requests" USING "btree" ("buyer_member_id");



CREATE INDEX "idx_purchase_requests_city_status_created" ON "public"."purchase_requests" USING "btree" ("destination_city", "status", "created_at" DESC);



CREATE INDEX "idx_purchase_requests_load_id" ON "public"."purchase_requests" USING "btree" ("load_id");



CREATE INDEX "idx_purchase_requests_status" ON "public"."purchase_requests" USING "btree" ("status");



CREATE INDEX "idx_rating_messages_sender_user_id" ON "public"."rating_messages" USING "btree" ("sender_user_id");



CREATE INDEX "idx_ratings_reviewer_member_id" ON "public"."ratings" USING "btree" ("reviewer_member_id");



CREATE INDEX "idx_ratings_target_load_id" ON "public"."ratings" USING "btree" ("target_load_id");



CREATE INDEX "idx_ratings_target_member_id" ON "public"."ratings" USING "btree" ("target_member_id");



CREATE INDEX "idx_seller_financial_transactions_order_id" ON "public"."seller_financial_transactions" USING "btree" ("order_id");



CREATE INDEX "idx_site_visits_member_id" ON "public"."site_visits" USING "btree" ("member_id");



CREATE INDEX "idx_social_contacts_external" ON "public"."social_contacts" USING "btree" ("external_user_id");



CREATE INDEX "idx_social_contacts_member_id" ON "public"."social_contacts" USING "btree" ("member_id");



CREATE INDEX "idx_social_messages_connection_id" ON "public"."social_messages" USING "btree" ("connection_id");



CREATE INDEX "idx_social_messages_processed" ON "public"."social_messages" USING "btree" ("processed");



CREATE INDEX "idx_social_messages_received" ON "public"."social_messages" USING "btree" ("received_at");



CREATE INDEX "idx_social_messages_sender" ON "public"."social_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_social_posts_connection_id" ON "public"."social_posts" USING "btree" ("connection_id");



CREATE INDEX "idx_webhook_events_processed" ON "public"."webhook_events" USING "btree" ("processed");



CREATE UNIQUE INDEX "load_price_tiers_load_sale_type_uidx" ON "public"."load_price_tiers" USING "btree" ("load_id", "sale_type");



CREATE UNIQUE INDEX "members_auth_user_id_uidx" ON "public"."members" USING "btree" ("auth_user_id");



CREATE INDEX "orders_delivery_status_created_idx" ON "public"."orders" USING "btree" ("delivery_status", "created_at" DESC);



CREATE UNIQUE INDEX "orders_invoice_number_uidx" ON "public"."orders" USING "btree" ("invoice_number");



CREATE INDEX "orders_payment_status_created_idx" ON "public"."orders" USING "btree" ("payment_status", "created_at" DESC);



CREATE INDEX "platform_financial_ledger_member_idx" ON "public"."platform_financial_ledger" USING "btree" ("member_id", "created_at" DESC) WHERE ("member_id" IS NOT NULL);



CREATE INDEX "platform_financial_ledger_order_idx" ON "public"."platform_financial_ledger" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "platform_financial_ledger_status_type_idx" ON "public"."platform_financial_ledger" USING "btree" ("entry_status", "entry_type", "created_at" DESC);



CREATE UNIQUE INDEX "purchase_requests_request_number_uidx" ON "public"."purchase_requests" USING "btree" ("request_number");



CREATE INDEX "rating_messages_rating_created_idx" ON "public"."rating_messages" USING "btree" ("rating_id", "created_at");



CREATE UNIQUE INDEX "ratings_one_review_per_order_target" ON "public"."ratings" USING "btree" ("order_id", "reviewer_member_id", "target_type");



CREATE UNIQUE INDEX "seller_finance_one_order_receipt_or_commission" ON "public"."seller_financial_transactions" USING "btree" ("order_id", "transaction_type") WHERE (("order_id" IS NOT NULL) AND ("transaction_type" = ANY (ARRAY['receipt'::"text", 'commission'::"text"])));



CREATE INDEX "seller_financial_transactions_member_date_idx" ON "public"."seller_financial_transactions" USING "btree" ("member_id", "transaction_date" DESC);



CREATE INDEX "site_visits_user_id_idx" ON "public"."site_visits" USING "btree" ("user_id");



CREATE INDEX "site_visits_visited_at_idx" ON "public"."site_visits" USING "btree" ("visited_at" DESC);



CREATE OR REPLACE TRIGGER "terrabar_enforce_professional_load_access" BEFORE INSERT OR UPDATE ON "public"."loads" FOR EACH ROW EXECUTE FUNCTION "public"."terrabar_enforce_professional_market_access"();



CREATE OR REPLACE TRIGGER "terrabar_enforce_professional_order_access" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."terrabar_enforce_professional_market_access"();



CREATE OR REPLACE TRIGGER "terrabar_enforce_professional_price_tier_access" BEFORE INSERT OR UPDATE ON "public"."load_price_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."terrabar_enforce_professional_market_access"();



CREATE OR REPLACE TRIGGER "trg_terrabar_credit_completed_seller_sale" AFTER INSERT OR UPDATE OF "payment_status", "delivery_status", "status", "total_price", "seller_member_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."terrabar_credit_completed_seller_sale"();



CREATE OR REPLACE TRIGGER "trg_terrabar_financial_ledger_immutable" BEFORE UPDATE ON "public"."seller_financial_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"();



ALTER TABLE ONLY "public"."admin_recovery_codes"
    ADD CONSTRAINT "admin_recovery_codes_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_user_cities"
    ADD CONSTRAINT "admin_user_cities_city_name_fkey" FOREIGN KEY ("city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_city_name_fkey" FOREIGN KEY ("city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."city_neighbors"
    ADD CONSTRAINT "city_neighbors_neighbor_city_name_fkey" FOREIGN KEY ("neighbor_city_name") REFERENCES "public"."cities"("city_name") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."load_images"
    ADD CONSTRAINT "load_images_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."load_price_tiers"
    ADD CONSTRAINT "load_price_tiers_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loads"
    ADD CONSTRAINT "loads_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loads"
    ADD CONSTRAINT "loads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."member_roles"
    ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_member_id_fkey" FOREIGN KEY ("buyer_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_seller_member_id_fkey" FOREIGN KEY ("seller_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outgoing_messages"
    ADD CONSTRAINT "outgoing_messages_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."platform_financial_ledger"
    ADD CONSTRAINT "platform_financial_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_buyer_member_id_fkey" FOREIGN KEY ("buyer_member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_requests"
    ADD CONSTRAINT "purchase_requests_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rating_messages"
    ADD CONSTRAINT "rating_messages_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rating_messages"
    ADD CONSTRAINT "rating_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_reviewer_member_id_fkey" FOREIGN KEY ("reviewer_member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_target_load_id_fkey" FOREIGN KEY ("target_load_id") REFERENCES "public"."loads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_target_member_id_fkey" FOREIGN KEY ("target_member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_bank_accounts"
    ADD CONSTRAINT "seller_bank_accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_financial_transactions"
    ADD CONSTRAINT "seller_financial_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_financial_transactions"
    ADD CONSTRAINT "seller_financial_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_contacts"
    ADD CONSTRAINT "social_contacts_member_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."social_messages"
    ADD CONSTRAINT "social_messages_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_connection_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."social_connections"("id");



ALTER TABLE "public"."admin_recovery_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_user_cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_user_cities_main_admin_manage" ON "public"."admin_user_cities" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "admin_user_cities_read_self_or_main_admin" ON "public"."admin_user_cities" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."id" = "admin_user_cities"."admin_user_id") AND ("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."is_active" = true) AND ("au"."admin_role" = 'city_manager'::"text"))))));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_main_admin_manage" ON "public"."admin_users" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "admin_users_read_own_active" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_active" = true)));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert_main_admin" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."terrabar_is_main_admin"() AND ("actor_member_id" IS NULL)));



CREATE POLICY "audit_logs_read_main_admin" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."cities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cities_main_admin_manage" ON "public"."cities" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "cities_read_active_authenticated" ON "public"."cities" FOR SELECT TO "authenticated" USING (("is_active" OR "public"."terrabar_is_main_admin"()));



ALTER TABLE "public"."city_neighbors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "city_neighbors_main_admin_manage" ON "public"."city_neighbors" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "city_neighbors_read_authenticated" ON "public"."city_neighbors" FOR SELECT TO "authenticated" USING (("is_enabled" OR "public"."terrabar_is_main_admin"()));



ALTER TABLE "public"."load_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "load_images_delete_owned_loads" ON "public"."load_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id"))));



CREATE POLICY "load_images_insert_owned_loads" ON "public"."load_images" FOR INSERT TO "authenticated" WITH CHECK (((("storage"."foldername"("storage_path"))[1] = (( SELECT "auth"."uid"() AS "uid"))::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON (("m"."id" = "l"."member_id")))
  WHERE (("l"."id" = "load_images"."load_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("l"."owner_member_id" IS NULL) OR ("l"."owner_member_id" = "m"."id")))))));



CREATE POLICY "load_images_read_visible_loads" ON "public"."load_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE ("l"."id" = "load_images"."load_id"))));



CREATE POLICY "load_images_update_owned_loads" ON "public"."load_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_images"."load_id"))));



ALTER TABLE "public"."load_price_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "load_price_tiers_delete_owned_loads" ON "public"."load_price_tiers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON ((("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("m"."id" = "l"."member_id") OR ("m"."id" = "l"."owner_member_id")))))
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



CREATE POLICY "load_price_tiers_insert_owned_loads" ON "public"."load_price_tiers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."loads" "l"
     JOIN "public"."members" "m" ON (("m"."id" = "l"."member_id")))
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("l"."id" = "load_price_tiers"."load_id") AND ("m"."auth_user_id" = "auth"."uid"()) AND (("l"."owner_member_id" IS NULL) OR ("l"."owner_member_id" = "m"."id")) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"("load_price_tiers"."sale_type") = ANY (ARRAY['professional'::"text", 'pro'::"text"]))) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"("load_price_tiers"."sale_type") = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text"]))))))));



CREATE POLICY "load_price_tiers_read_visible_loads" ON "public"."load_price_tiers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE ("l"."id" = "load_price_tiers"."load_id"))));



CREATE POLICY "load_price_tiers_update_owned_loads" ON "public"."load_price_tiers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."loads" "l"
     JOIN "public"."members" "m" ON (("m"."id" = "l"."member_id")))
  WHERE (("l"."id" = "load_price_tiers"."load_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("l"."owner_member_id" IS NULL) OR ("l"."owner_member_id" = "m"."id")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."loads" "l"
     JOIN "public"."members" "m" ON (("m"."id" = "l"."member_id")))
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("l"."id" = "load_price_tiers"."load_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("l"."owner_member_id" IS NULL) OR ("l"."owner_member_id" = "m"."id")) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"("load_price_tiers"."sale_type") = ANY (ARRAY['professional'::"text", 'pro'::"text"]))) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"("load_price_tiers"."sale_type") = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text"]))))))));



ALTER TABLE "public"."loads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loads_city_manager_review_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city"))))));



CREATE POLICY "loads_insert_approved_member" ON "public"."loads" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'active'::"text") AND ("quantity" > (0)::numeric) AND ("price" > (0)::numeric) AND (COALESCE("count", (0)::numeric) > (0)::numeric) AND (COALESCE("min_order_quantity", (0)::numeric) > (0)::numeric) AND ("min_order_quantity" <= "count") AND (COALESCE("min_quantity", (0)::numeric) > (0)::numeric) AND ("min_quantity" <= "quantity") AND ("owner_member_id" = "member_id") AND (EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("m"."id" = "loads"."member_id") AND ("m"."auth_user_id" = "auth"."uid"()) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"(COALESCE("loads"."sale_type", ''::"text")) = ANY (ARRAY['professional'::"text", 'pro'::"text"])) AND ("lower"(COALESCE("loads"."seller_type", "loads"."role", ''::"text")) = 'supplier'::"text")) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"(COALESCE("loads"."sale_type", 'regular'::"text")) = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text"])) AND ("lower"(COALESCE("loads"."seller_type", "loads"."role", ''::"text")) <> 'supplier'::"text") AND ("loads"."city" = "m"."city"))))))));



CREATE POLICY "loads_main_admin_review_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "loads_owner_deactivate_update" ON "public"."loads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id")))))) WITH CHECK ((("status" = ANY (ARRAY['inactive'::"text", 'pending'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id")))))));



CREATE POLICY "loads_owner_delete_unordered" ON "public"."loads" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."id" = "loads"."member_id") AND (("loads"."owner_member_id" IS NULL) OR ("loads"."owner_member_id" = "m"."id")) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"(COALESCE("loads"."sale_type", ''::"text")) = ANY (ARRAY['professional'::"text", 'pro'::"text"]))) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"(COALESCE("loads"."sale_type", 'regular'::"text")) = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text"])) AND ("loads"."city" = "m"."city")))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE ("o"."load_id" = "loads"."id"))))));



CREATE POLICY "loads_owner_edit_own" ON "public"."loads" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."id" = "loads"."member_id") AND (("loads"."owner_member_id" IS NULL) OR ("loads"."owner_member_id" = "m"."id")) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"(COALESCE("loads"."sale_type", ''::"text")) = ANY (ARRAY['professional'::"text", 'pro'::"text"]))) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"(COALESCE("loads"."sale_type", 'regular'::"text")) = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text"])) AND ("loads"."city" = "m"."city"))))))) WITH CHECK ((("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'pending'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."members" "m"
     JOIN "public"."member_roles" "mr" ON (("mr"."member_id" = "m"."id")))
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."id" = "loads"."member_id") AND (("loads"."owner_member_id" IS NULL) OR ("loads"."owner_member_id" = "m"."id")) AND ("mr"."approval_status" = 'approved'::"text") AND ((("lower"("mr"."role_code") = 'supplier'::"text") AND ("lower"(COALESCE("loads"."sale_type", ''::"text")) = ANY (ARRAY['professional'::"text", 'pro'::"text"]))) OR (("lower"("mr"."role_code") = ANY (ARRAY['bar_seller'::"text", 'seller'::"text"])) AND ("lower"(COALESCE("loads"."sale_type", 'regular'::"text")) = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text"])) AND ("loads"."city" = "m"."city"))))))));



CREATE POLICY "loads_select_authorized" ON "public"."loads" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "loads"."city") OR ("au"."city" = "loads"."city"))))) OR (EXISTS ( SELECT 1
   FROM "public"."members" "owner"
  WHERE (("owner"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("owner"."id" = "loads"."member_id") OR ("owner"."id" = "loads"."owner_member_id"))))) OR (("status" = 'active'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((EXISTS ( SELECT 1
           FROM "public"."member_roles" "professional_role"
          WHERE (("professional_role"."member_id" = "m"."id") AND ("professional_role"."approval_status" = 'approved'::"text") AND ("lower"("professional_role"."role_code") = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'seller'::"text"]))))) OR (("lower"(COALESCE(NULLIF("btrim"("loads"."seller_type"), ''::"text"), NULLIF("btrim"("loads"."role"), ''::"text"), ''::"text")) <> 'supplier'::"text") AND ("lower"(COALESCE(NULLIF("btrim"("loads"."sale_type"), ''::"text"), 'regular'::"text")) = ANY (ARRAY['regular'::"text", 'retail'::"text", 'wholesale'::"text", 'special'::"text"])) AND (("m"."city" = "loads"."city") OR ((EXISTS ( SELECT 1
           FROM "public"."member_roles" "special_role"
          WHERE (("special_role"."member_id" = "m"."id") AND ("special_role"."approval_status" = 'approved'::"text") AND ("lower"("special_role"."role_code") = ANY (ARRAY['special_buyer'::"text", 'buyer_special'::"text"]))))) AND (EXISTS ( SELECT 1
           FROM "public"."city_neighbors" "cn"
          WHERE (("cn"."is_enabled" = true) AND ((("cn"."city_name" = "m"."city") AND ("cn"."neighbor_city_name" = "loads"."city")) OR (("cn"."neighbor_city_name" = "m"."city") AND ("cn"."city_name" = "loads"."city"))))))))))))))));



ALTER TABLE "public"."member_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_roles_city_manager_read" ON "public"."member_roles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city"))))));



CREATE POLICY "member_roles_city_manager_update" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city")))))) WITH CHECK ((("approval_status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])) AND ((("approval_status" = 'approved'::"text") AND ("approved_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("approved_at" IS NOT NULL)) OR (("approval_status" = 'rejected'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL))) AND (EXISTS ( SELECT 1
   FROM (("public"."members" "m"
     JOIN "public"."admin_users" "au" ON (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("m"."id" = "member_roles"."member_id") AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "m"."city") OR ("au"."city" = "m"."city")))))));



CREATE POLICY "member_roles_main_admin_delete" ON "public"."member_roles" FOR DELETE TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "member_roles_main_admin_update" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "member_roles_read_self_or_admin" ON "public"."member_roles" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "member_roles_resubmit_rejected_self" ON "public"."member_roles" FOR UPDATE TO "authenticated" USING ((("approval_status" = 'rejected'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("approval_status" = 'pending'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "member_roles_submit_pending_self" ON "public"."member_roles" FOR INSERT TO "authenticated" WITH CHECK ((("approval_status" = 'pending'::"text") AND ("approved_by" IS NULL) AND ("approved_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "member_roles"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_city_manager_read_assigned_city" ON "public"."members" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "members"."city") OR ("au"."city" = "members"."city"))))));



CREATE POLICY "members_insert_own_profile" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK ((("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role" = ANY (ARRAY['buyer'::"text", 'supplier'::"text", 'seller'::"text", 'bar_seller'::"text"])) AND (COALESCE("verification_status", 'pending'::"text") = 'pending'::"text")));



CREATE POLICY "members_main_admin_read_all" ON "public"."members" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "members_read_own_profile" ON "public"."members" FOR SELECT TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "members_update_own_profile" ON "public"."members" FOR UPDATE TO "authenticated" USING (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("auth_user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_templates_main_admin_manage" ON "public"."message_templates" TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_buyer_pending_request" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'pending'::"text") AND ("buyer_member_id" IS NOT NULL) AND ("seller_member_id" IS NOT NULL) AND ("unit" = 'package'::"text") AND ("quantity" > (0)::numeric) AND ("price" > (0)::numeric) AND ("total_price" > (0)::numeric) AND ("sale_type" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'special'::"text", 'professional'::"text", 'regular'::"text", 'pro'::"text"])) AND ("delivery_type" = ANY (ARRAY['terrabar'::"text", 'pickup'::"text", 'buyer_carrier'::"text"])) AND (("delivery_type" = 'pickup'::"text") OR (NULLIF("btrim"("delivery_address"), ''::"text") IS NOT NULL)) AND (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "orders"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("orders"."customer_name" = "buyer"."full_name") AND (NOT ("orders"."customer_phone" IS DISTINCT FROM "buyer"."phone")) AND (NOT ("orders"."customer_email" IS DISTINCT FROM "buyer"."email")) AND ("orders"."customer_city" = "buyer"."city") AND (("buyer"."role" = 'buyer'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "buyer"."id") AND (("mr"."role_code" = 'buyer'::"text") OR (("mr"."role_code" = ANY (ARRAY['special_buyer'::"text", 'professional_buyer'::"text"])) AND ("mr"."approval_status" = 'approved'::"text")) OR ("lower"("mr"."role_code") = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'seller'::"text"])))))))))) AND (EXISTS ( SELECT 1
   FROM "public"."loads" "l"
  WHERE (("l"."id" = "orders"."load_id") AND ("l"."status" = 'active'::"text") AND ("l"."member_id" = "orders"."seller_member_id") AND ("orders"."quantity" <= COALESCE("l"."count", (0)::numeric)) AND "public"."terrabar_order_pricing_valid"("orders"."load_id", "orders"."sale_type", "orders"."quantity", "orders"."price", "orders"."total_price"))))));



CREATE POLICY "orders_read_authorized" ON "public"."orders" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "orders"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "orders"."customer_city") OR ("au"."city" = "orders"."customer_city")))))));



CREATE POLICY "orders_seller_review_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((("status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("status" = ANY (ARRAY['accepted'::"text", 'rejected'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."members" "seller"
  WHERE (("seller"."id" = "orders"."seller_member_id") AND ("seller"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."outgoing_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_financial_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_financial_ledger_admin_insert" ON "public"."platform_financial_ledger" FOR INSERT TO "authenticated" WITH CHECK (("public"."terrabar_is_main_admin"() AND (("created_by" IS NULL) OR ("created_by" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "platform_financial_ledger_admin_select" ON "public"."platform_financial_ledger" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "platform_financial_ledger_admin_update" ON "public"."platform_financial_ledger" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."purchase_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchase_requests_insert_own_direct_order" ON "public"."purchase_requests" FOR INSERT TO "authenticated" WITH CHECK ((("status" = 'new'::"text") AND ("load_id" IS NULL) AND ("buyer_member_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "purchase_requests"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ((COALESCE("buyer"."role", ''::"text") = ANY (ARRAY['buyer'::"text", 'special_buyer'::"text", 'professional_buyer'::"text"])) OR (EXISTS ( SELECT 1
           FROM "public"."member_roles" "mr"
          WHERE (("mr"."member_id" = "buyer"."id") AND ("lower"("mr"."role_code") = ANY (ARRAY['supplier'::"text", 'bar_seller'::"text", 'seller'::"text"])))))) AND (("purchase_requests"."destination_city" IS NULL) OR ("purchase_requests"."destination_city" = "buyer"."city")))))));



CREATE POLICY "purchase_requests_manager_update" ON "public"."purchase_requests" FOR UPDATE TO "authenticated" USING ((("status" = ANY (ARRAY['new'::"text", 'in_review'::"text", 'sourcing'::"text", 'offer_ready'::"text"])) AND ("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city")))))))) WITH CHECK ((("status" = ANY (ARRAY['in_review'::"text", 'sourcing'::"text", 'offer_ready'::"text", 'rejected'::"text", 'cancelled'::"text", 'completed'::"text"])) AND ("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city"))))))));



CREATE POLICY "purchase_requests_read_authorized" ON "public"."purchase_requests" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."members" "buyer"
  WHERE (("buyer"."id" = "purchase_requests"."buyer_member_id") AND ("buyer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_users" "au"
     LEFT JOIN "public"."admin_user_cities" "auc" ON (("auc"."admin_user_id" = "au"."id")))
  WHERE (("au"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("au"."admin_role" = 'city_manager'::"text") AND ("au"."is_active" = true) AND (("auc"."city_name" = "purchase_requests"."destination_city") OR ("au"."city" = "purchase_requests"."destination_city")))))));



ALTER TABLE "public"."rating_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rating_messages_insert_participants" ON "public"."rating_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."ratings" "r"
     JOIN "public"."members" "m" ON (("m"."id" = "r"."reviewer_member_id")))
  WHERE (("r"."id" = "rating_messages"."rating_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "rating_messages_read_participants" ON "public"."rating_messages" FOR SELECT TO "authenticated" USING (("public"."terrabar_is_main_admin"() OR (EXISTS ( SELECT 1
   FROM ("public"."ratings" "r"
     JOIN "public"."members" "m" ON (("m"."id" = "r"."reviewer_member_id")))
  WHERE (("r"."id" = "rating_messages"."rating_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ratings_insert_verified_order" ON "public"."ratings" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."members" "reviewer"
  WHERE (("reviewer"."id" = "ratings"."reviewer_member_id") AND ("reviewer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) AND ("order_id" IS NOT NULL) AND ((("target_type" = 'load'::"text") AND ("target_load_id" IS NOT NULL) AND ("target_member_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."loads" "l" ON (("l"."id" = "o"."load_id")))
  WHERE (("o"."id" = "ratings"."order_id") AND ("o"."load_id" = "ratings"."target_load_id") AND ("o"."buyer_member_id" = "ratings"."reviewer_member_id") AND (("o"."status" = ANY (ARRAY['delivered'::"text", 'received'::"text", 'completed'::"text"])) OR ("o"."delivery_status" = 'delivered'::"text")) AND ("l"."member_id" = "o"."seller_member_id") AND ("l"."member_id" <> "ratings"."reviewer_member_id"))))) OR (("target_type" = 'member'::"text") AND ("target_member_id" IS NOT NULL) AND ("target_load_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "ratings"."order_id") AND ("o"."buyer_member_id" = "ratings"."reviewer_member_id") AND ("o"."seller_member_id" = "ratings"."target_member_id") AND (("o"."status" = ANY (ARRAY['delivered'::"text", 'received'::"text", 'completed'::"text"])) OR ("o"."delivery_status" = 'delivered'::"text")) AND ("o"."seller_member_id" <> "o"."buyer_member_id"))))))));



CREATE POLICY "ratings_main_admin_read_all" ON "public"."ratings" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "ratings_read_own" ON "public"."ratings" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."members" "reviewer"
  WHERE (("reviewer"."id" = "ratings"."reviewer_member_id") AND ("reviewer"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."terrabar_is_main_admin"()));



ALTER TABLE "public"."seller_bank_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_bank_accounts_insert_own" ON "public"."seller_bank_accounts" FOR INSERT TO "authenticated" WITH CHECK ((("verification_status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "seller_bank_accounts"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "seller_bank_accounts_read_main_admin" ON "public"."seller_bank_accounts" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "seller_bank_accounts_read_own" ON "public"."seller_bank_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "seller_bank_accounts"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "seller_bank_accounts_update_main_admin" ON "public"."seller_bank_accounts" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "seller_bank_accounts_update_own" ON "public"."seller_bank_accounts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "seller_bank_accounts"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((("verification_status" = 'pending'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "seller_bank_accounts"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."seller_financial_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_financial_transactions_admin_insert" ON "public"."seller_financial_transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "seller_financial_transactions_admin_update" ON "public"."seller_financial_transactions" FOR UPDATE TO "authenticated" USING ("public"."terrabar_is_main_admin"()) WITH CHECK ("public"."terrabar_is_main_admin"());



CREATE POLICY "seller_financial_transactions_read_main_admin" ON "public"."seller_financial_transactions" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



CREATE POLICY "seller_financial_transactions_read_own" ON "public"."seller_financial_transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "seller_financial_transactions"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."site_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_visits_insert_own" ON "public"."site_visits" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("member_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."members" "m"
  WHERE (("m"."id" = "site_visits"."member_id") AND ("m"."auth_user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "site_visits_read_main_admin" ON "public"."site_visits" FOR SELECT TO "authenticated" USING ("public"."terrabar_is_main_admin"());



ALTER TABLE "public"."social_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_storefront_member"("p_member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_storefront_member"("p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storefront_member"("p_member_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_archive_load"("p_load_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_archive_load"("p_load_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_archive_load"("p_load_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_archive_member"("p_member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_archive_member"("p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_archive_member"("p_member_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_create_payout"("p_member_id" "uuid", "p_amount" numeric, "p_reference_code" "text", "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_restore_load"("p_load_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_restore_load"("p_load_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_restore_load"("p_load_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_restore_member"("p_member_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_restore_member"("p_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_restore_member"("p_member_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_admin_update_payout_status"("p_transaction_id" "uuid", "p_status" "text", "p_reference_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_credit_completed_seller_sale"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_credit_completed_seller_sale"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_enforce_professional_market_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_enforce_professional_market_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_enforce_professional_market_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."terrabar_is_city_manager"("target_city" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."terrabar_is_main_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_is_main_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."terrabar_is_main_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."terrabar_order_pricing_valid"("p_load_id" "uuid", "p_sale_type" "text", "p_quantity" numeric, "p_price" numeric, "p_total" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."terrabar_order_pricing_valid"("p_load_id" "uuid", "p_sale_type" "text", "p_quantity" numeric, "p_price" numeric, "p_total" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_order_pricing_valid"("p_load_id" "uuid", "p_sale_type" "text", "p_quantity" numeric, "p_price" numeric, "p_total" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"() TO "anon";
GRANT ALL ON FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."terrabar_prevent_financial_ledger_core_edits"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_recovery_codes" TO "service_role";



GRANT ALL ON TABLE "public"."admin_user_cities" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_user_cities" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."admin_users" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";
GRANT INSERT ON TABLE "public"."audit_logs" TO "authenticated";



GRANT ALL ON TABLE "public"."cities" TO "authenticated";
GRANT ALL ON TABLE "public"."cities" TO "service_role";



GRANT ALL ON TABLE "public"."city_neighbors" TO "authenticated";
GRANT ALL ON TABLE "public"."city_neighbors" TO "service_role";



GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."load_images" TO "authenticated";
GRANT ALL ON TABLE "public"."load_images" TO "service_role";



GRANT SELECT,INSERT,DELETE,MAINTAIN,UPDATE ON TABLE "public"."load_price_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."load_price_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."loads" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("name"),INSERT("name") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("city"),INSERT("city") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("role"),INSERT("role") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("product_type"),INSERT("product_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("origin"),INSERT("origin") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("engine"),INSERT("engine") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("source_market") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("price"),INSERT("price") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("price_unit"),INSERT("price_unit") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("quality"),INSERT("quality") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("description"),INSERT("description") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("ready_date"),INSERT("ready_date") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("member_id"),INSERT("member_id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."loads" TO "authenticated";



GRANT INSERT("contact_phone") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("min_quantity"),INSERT("min_quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("unit"),INSERT("unit") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("owner_member_id"),INSERT("owner_member_id") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("seller_type"),INSERT("seller_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("source_region"),INSERT("source_region") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("sale_type"),INSERT("sale_type") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("min_order_quantity"),INSERT("min_order_quantity") ON TABLE "public"."loads" TO "authenticated";



GRANT SELECT("count"),INSERT("count") ON TABLE "public"."loads" TO "authenticated";



GRANT ALL ON TABLE "public"."member_roles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("member_id") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("role_code") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approval_status"),UPDATE("approval_status") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approved_by"),UPDATE("approved_by") ON TABLE "public"."member_roles" TO "authenticated";



GRANT INSERT("approved_at"),UPDATE("approved_at") ON TABLE "public"."member_roles" TO "authenticated";



GRANT UPDATE("request_note") ON TABLE "public"."member_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."members" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("full_name"),UPDATE("full_name") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("phone"),UPDATE("phone") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("city"),UPDATE("city") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("role") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("products"),UPDATE("products") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("verification_status") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("auth_user_id") ON TABLE "public"."members" TO "authenticated";



GRANT INSERT("email"),UPDATE("email") ON TABLE "public"."members" TO "authenticated";



GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_invoice_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_invoice_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_invoice_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("load_id"),INSERT("load_id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("customer_name"),INSERT("customer_name") ON TABLE "public"."orders" TO "authenticated";



GRANT INSERT("customer_phone") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("customer_city"),INSERT("customer_city") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("unit"),INSERT("unit") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("price"),INSERT("price") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("total_price"),INSERT("total_price") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_address"),INSERT("delivery_address") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_type"),INSERT("delivery_type") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("notes"),INSERT("notes") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("buyer_member_id"),INSERT("buyer_member_id") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("seller_member_id"),INSERT("seller_member_id") ON TABLE "public"."orders" TO "authenticated";



GRANT INSERT("customer_email") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("payment_status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("paid_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_status") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("shipped_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivered_at") ON TABLE "public"."orders" TO "authenticated";



GRANT SELECT("delivery_confirmation_method") ON TABLE "public"."orders" TO "authenticated";



GRANT ALL ON TABLE "public"."outgoing_messages" TO "service_role";



GRANT ALL ON TABLE "public"."platform_financial_ledger" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."platform_financial_ledger" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."purchase_requests_request_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_requests_request_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_requests_request_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_requests" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("buyer_member_id"),INSERT("buyer_member_id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("product_type"),INSERT("product_type") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quantity"),INSERT("quantity") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quantity_unit"),INSERT("quantity_unit") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("destination_city"),INSERT("destination_city") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("quality_requirements"),INSERT("quality_requirements") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("needed_by"),INSERT("needed_by") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("notes"),INSERT("notes") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("status"),INSERT("status"),UPDATE("status") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT SELECT("load_id"),INSERT("load_id") ON TABLE "public"."purchase_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."rating_messages" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."rating_messages" TO "authenticated";



GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON TABLE "public"."seller_bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."seller_financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."site_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."site_visits" TO "service_role";



GRANT ALL ON TABLE "public"."site_visit_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."site_visit_summary" TO "service_role";



GRANT ALL ON TABLE "public"."social_connections" TO "service_role";



GRANT ALL ON TABLE "public"."social_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."social_messages" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







