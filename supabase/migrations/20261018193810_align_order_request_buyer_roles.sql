-- Let approved suppliers and bar sellers use the professional marketplace as buyers.
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
  AND sale_type IN ('retail', 'wholesale', 'special', 'professional', 'regular', 'pro')
  AND delivery_type IN ('terrabar', 'pickup', 'buyer_carrier')
  AND (delivery_type = 'pickup' OR NULLIF(btrim(delivery_address), '') IS NOT NULL)
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
          SELECT 1
          FROM public.member_roles mr
          WHERE mr.member_id = buyer.id
            AND (
              (mr.role_code = 'buyer')
              OR (mr.role_code IN ('special_buyer', 'professional_buyer') AND mr.approval_status = 'approved')
              OR (lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller') AND mr.approval_status = 'approved')
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
      AND orders.quantity >= COALESCE(
        (SELECT t.minimum_packages FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
        l.min_order_quantity,
        1
      )
      AND orders.quantity <= COALESCE(l.count, 0)
      AND orders.price = COALESCE(
        (SELECT t.unit_price FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
        l.price
      )
      AND orders.total_price = (
        orders.quantity
        * COALESCE(l.package_weight, GREATEST(1, round(l.quantity / NULLIF(l.count, 0))))
        * COALESCE(
          (SELECT t.unit_price FROM public.load_price_tiers t WHERE t.load_id = l.id AND t.sale_type = orders.sale_type),
          l.price
        )
      )
  )
);

DROP POLICY IF EXISTS purchase_requests_insert_own_direct_order ON public.purchase_requests;
CREATE POLICY purchase_requests_insert_own_direct_order
ON public.purchase_requests
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'new'
  AND load_id IS NULL
  AND buyer_member_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.members buyer
    WHERE buyer.id = purchase_requests.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
      AND (
        COALESCE(buyer.role, '') IN ('buyer', 'special_buyer', 'professional_buyer')
        OR EXISTS (
          SELECT 1 FROM public.member_roles mr
          WHERE mr.member_id = buyer.id
            AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
            AND mr.approval_status = 'approved'
        )
      )
      AND (
        purchase_requests.destination_city IS NULL
        OR purchase_requests.destination_city = buyer.city
      )
  )
);
