-- Validate cart/order totals against the authorized sale type and quantity band.
-- Applied to the existing Terrabar Supabase project as migration
-- 20261021071112_validate_quantity_based_order_price_tiers.sql.

CREATE OR REPLACE FUNCTION public.terrabar_order_pricing_valid(
  p_load_id uuid,
  p_sale_type text,
  p_quantity numeric,
  p_price numeric,
  p_total numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.terrabar_order_pricing_valid(uuid, text, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terrabar_order_pricing_valid(uuid, text, numeric, numeric, numeric) TO authenticated;

DROP POLICY IF EXISTS orders_insert_buyer_pending_request ON public.orders;

CREATE POLICY orders_insert_buyer_pending_request
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND buyer_member_id IS NOT NULL
  AND seller_member_id IS NOT NULL
  AND unit = 'package'
  AND quantity > 0
  AND price > 0
  AND total_price > 0
  AND sale_type = ANY (ARRAY['retail','wholesale','special','professional','regular','pro'])
  AND delivery_type = ANY (ARRAY['terrabar','pickup','buyer_carrier'])
  AND (delivery_type = 'pickup' OR NULLIF(BTRIM(delivery_address), '') IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.members buyer
    WHERE buyer.id = orders.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
      AND orders.customer_name = buyer.full_name
      AND orders.customer_phone IS NOT DISTINCT FROM buyer.phone
      AND orders.customer_email IS NOT DISTINCT FROM buyer.email
      AND orders.customer_city = buyer.city
      AND (
        buyer.role = 'buyer'
        OR EXISTS (
          SELECT 1 FROM public.member_roles mr
          WHERE mr.member_id = buyer.id
            AND (
              mr.role_code = 'buyer'
              OR (mr.role_code IN ('special_buyer','professional_buyer') AND mr.approval_status = 'approved')
              OR LOWER(mr.role_code) IN ('supplier','bar_seller','seller')
            )
        )
      )
  )
  AND EXISTS (
    SELECT 1
    FROM public.loads l
    WHERE l.id = orders.load_id
      AND l.status = 'active'
      AND l.member_id = orders.seller_member_id
      AND orders.quantity <= COALESCE(l.count, 0)
      AND public.terrabar_order_pricing_valid(
        orders.load_id, orders.sale_type, orders.quantity, orders.price, orders.total_price
      )
  )
);
