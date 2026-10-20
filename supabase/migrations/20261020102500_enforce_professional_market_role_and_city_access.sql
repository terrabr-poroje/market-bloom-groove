-- Enforce Terrabar professional purchase/sale access in the database, not only in the UI.
CREATE OR REPLACE FUNCTION public.terrabar_enforce_professional_market_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  actor uuid := auth.uid();
  buyer_city text;
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
    SELECT bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code = 'bar_seller'), bool_or(mr.role_code IN ('supplier', 'bar_seller'))
      INTO has_supplier_role, has_bar_seller_role, has_professional_role
    FROM public.members m JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.id = COALESCE(NEW.owner_member_id, NEW.member_id) AND m.auth_user_id = actor AND mr.approval_status = 'approved';
    IF NOT COALESCE(has_professional_role, false) THEN RAISE EXCEPTION 'Only approved suppliers or bar sellers may publish loads'; END IF;
    IF COALESCE(has_supplier_role, false) AND NEW.sale_type IS DISTINCT FROM 'professional' THEN RAISE EXCEPTION 'Suppliers may only publish in the professional sale section'; END IF;
    IF COALESCE(has_bar_seller_role, false) AND NOT COALESCE(has_supplier_role, false) AND NEW.sale_type IN ('professional', 'pro') THEN RAISE EXCEPTION 'Bar sellers may not publish in the professional sale section'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'load_price_tiers' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.loads l JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id) WHERE l.id = NEW.load_id AND m.auth_user_id = actor)
      THEN RAISE EXCEPTION 'You may only manage price tiers for your own loads'; END IF;
    SELECT bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code = 'bar_seller')
      INTO has_supplier_role, has_bar_seller_role
    FROM public.loads l JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id)
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE l.id = NEW.load_id AND m.auth_user_id = actor AND mr.approval_status = 'approved';
    IF COALESCE(has_supplier_role, false) AND NEW.sale_type NOT IN ('professional', 'pro') THEN RAISE EXCEPTION 'Suppliers may only create professional price tiers'; END IF;
    IF COALESCE(has_bar_seller_role, false) AND NOT COALESCE(has_supplier_role, false) AND NEW.sale_type IN ('professional', 'pro') THEN RAISE EXCEPTION 'Bar sellers may not create professional price tiers'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    IF NEW.buyer_member_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.members m WHERE m.id = NEW.buyer_member_id AND m.auth_user_id = actor)
      THEN RAISE EXCEPTION 'Orders must belong to the signed-in buyer member'; END IF;
    SELECT m.city, bool_or(mr.role_code = 'supplier'), bool_or(mr.role_code = 'bar_seller'), bool_or(mr.role_code = 'special_buyer'), bool_or(mr.role_code IN ('buyer', 'special_buyer', 'professional_buyer'))
      INTO buyer_city, has_supplier_role, has_bar_seller_role, has_special_buyer_role, has_buyer_role
    FROM public.members m JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.id = NEW.buyer_member_id AND m.auth_user_id = actor AND mr.approval_status = 'approved' GROUP BY m.city;
    SELECT COALESCE(l.sale_type, 'regular'), m.city INTO load_sale_type, seller_city
    FROM public.loads l LEFT JOIN public.members m ON m.id = COALESCE(l.owner_member_id, l.member_id)
    WHERE l.id = NEW.load_id AND l.status = 'active';
    IF load_sale_type IS NULL THEN RAISE EXCEPTION 'The selected load is not available'; END IF;
    IF load_sale_type IN ('professional', 'pro') THEN
      IF NOT (COALESCE(has_supplier_role, false) OR COALESCE(has_bar_seller_role, false)) THEN RAISE EXCEPTION 'Professional purchases are only available to approved suppliers and bar sellers'; END IF;
    ELSIF COALESCE(has_supplier_role, false) OR COALESCE(has_bar_seller_role, false) THEN
      NULL;
    ELSIF COALESCE(has_special_buyer_role, false) THEN
      IF buyer_city IS DISTINCT FROM seller_city AND NOT EXISTS (SELECT 1 FROM public.city_neighbors cn WHERE cn.is_enabled = true AND ((cn.city_name = buyer_city AND cn.neighbor_city_name = seller_city) OR (cn.city_name = seller_city AND cn.neighbor_city_name = buyer_city)))
        THEN RAISE EXCEPTION 'This load is outside the buyer allowed city range'; END IF;
    ELSE
      IF buyer_city IS DISTINCT FROM seller_city THEN RAISE EXCEPTION 'Ordinary buyers may only purchase within their registered city'; END IF;
      IF NOT COALESCE(has_buyer_role, false) THEN RAISE EXCEPTION 'This account does not have purchase access'; END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS terrabar_enforce_professional_load_access ON public.loads;
CREATE TRIGGER terrabar_enforce_professional_load_access BEFORE INSERT OR UPDATE ON public.loads FOR EACH ROW EXECUTE FUNCTION public.terrabar_enforce_professional_market_access();
DROP TRIGGER IF EXISTS terrabar_enforce_professional_price_tier_access ON public.load_price_tiers;
CREATE TRIGGER terrabar_enforce_professional_price_tier_access BEFORE INSERT OR UPDATE ON public.load_price_tiers FOR EACH ROW EXECUTE FUNCTION public.terrabar_enforce_professional_market_access();
DROP TRIGGER IF EXISTS terrabar_enforce_professional_order_access ON public.orders;
CREATE TRIGGER terrabar_enforce_professional_order_access BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.terrabar_enforce_professional_market_access();
REVOKE ALL ON FUNCTION public.terrabar_enforce_professional_market_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_enforce_professional_market_access() TO authenticated;
COMMENT ON FUNCTION public.terrabar_enforce_professional_market_access() IS 'Server-side guard for professional sale/purchase roles and ordinary/special buyer city restrictions.';
