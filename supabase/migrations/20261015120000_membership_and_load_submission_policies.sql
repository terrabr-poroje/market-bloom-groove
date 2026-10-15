-- PROPOSED ONLY: review before applying to production Supabase.
-- Adds the minimum authenticated self-service paths needed by the current
-- membership form and load announcement flow. This file is NOT auto-applied
-- until merged/deployed through the repository workflow.

-- A signed-in user may create only their own member profile.
DROP POLICY IF EXISTS members_insert_own_profile ON public.members;
CREATE POLICY members_insert_own_profile
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_id = (SELECT auth.uid())
  AND role IN ('buyer', 'supplier', 'seller', 'bar_seller')
  AND COALESCE(verification_status, 'pending') = 'pending'
);

-- Only members with an approved supplier/bar-seller role may submit a load.
-- The submitted member_id must be the caller's own member profile.
-- Loads are created as pending and still require the existing admin review flow.
DROP POLICY IF EXISTS loads_insert_approved_member ON public.loads;
CREATE POLICY loads_insert_approved_member
ON public.loads
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.member_roles AS mr ON mr.member_id = m.id
    WHERE m.id = public.loads.member_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND mr.approval_status = 'approved'
      AND mr.role_code IN ('supplier', 'bar_seller')
  )
  AND quantity > 0
  AND price > 0
  AND count > 0
  AND min_order_quantity > 0
  AND min_order_quantity <= count
  AND min_quantity > 0
  AND min_quantity <= quantity
);

GRANT INSERT ON TABLE public.members TO authenticated;
GRANT INSERT ON TABLE public.loads TO authenticated;

-- Consolidate listing visibility into ONE permissive SELECT policy.
-- PostgreSQL combines permissive policies with OR, so separate "narrower"
-- policies do not restrict a broader policy. Remove prior broad policies first.
DROP POLICY IF EXISTS loads_owner_access ON public.loads;
DROP POLICY IF EXISTS loads_special_buyer_city_access ON public.loads;
DROP POLICY IF EXISTS loads_marketplace_city_access ON public.loads;
DROP POLICY IF EXISTS loads_main_admin_review_select ON public.loads;
DROP POLICY IF EXISTS loads_regular_buyer_city_access ON public.loads;
DROP POLICY IF EXISTS loads_professional_buyer_access ON public.loads;

CREATE POLICY loads_select_authorized
ON public.loads
FOR SELECT
TO authenticated
USING (
  -- Main admin can review all statuses.
  public.terrabar_is_main_admin()

  -- City managers can review only loads in their assigned city scope.
  OR EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )

  -- Owners can see their own pending/rejected/active listings.
  OR EXISTS (
    SELECT 1
    FROM public.members AS owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = public.loads.member_id OR owner.id = public.loads.owner_member_id)
  )

  -- Non-admin marketplace users see active inventory according to role/city.
  OR (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.members AS m
      WHERE m.auth_user_id = (SELECT auth.uid())
        AND (
          -- Approved professional buyers: no city restriction.
          EXISTS (
            SELECT 1 FROM public.member_roles AS mr
            WHERE mr.member_id = m.id
              AND mr.role_code = 'professional_buyer'
              AND mr.approval_status = 'approved'
          )

          -- Regular buyers: own city, regular listings only; buyer approval
          -- is not required by the product rules.
          OR (
            m.city = public.loads.city
            AND COALESCE(public.loads.sale_type, 'regular') = 'regular'
            AND (
              m.role = 'buyer'
              OR EXISTS (
                SELECT 1 FROM public.member_roles AS mr
                WHERE mr.member_id = m.id
                  AND mr.role_code = 'buyer'
              )
            )
          )

          -- Special buyers may see special inventory in their own city and
          -- enabled neighboring cities. A member may be classified directly
          -- on members.role; otherwise the special_buyer role must be approved.
          OR (
            public.loads.sale_type = 'special'
            AND (
              m.role = 'special_buyer'
              OR EXISTS (
                SELECT 1 FROM public.member_roles AS mr
                WHERE mr.member_id = m.id
                  AND mr.role_code = 'special_buyer'
                  AND mr.approval_status = 'approved'
              )
            )
            AND (
              public.loads.city = m.city
              OR EXISTS (
                SELECT 1 FROM public.city_neighbors AS cn
                WHERE cn.is_enabled = true
                  AND (
                    (cn.city_name = m.city AND cn.neighbor_city_name = public.loads.city)
                    OR (cn.neighbor_city_name = m.city AND cn.city_name = public.loads.city)
                  )
              )
            )
          )

          -- Approved suppliers/bar-sellers may browse active inventory in
          -- their own city; owner access above retains visibility to own loads.
          OR (
            m.city = public.loads.city
            AND EXISTS (
              SELECT 1 FROM public.member_roles AS mr
              WHERE mr.member_id = m.id
                AND mr.role_code IN ('supplier', 'bar_seller')
                AND mr.approval_status = 'approved'
            )
          )
        )
    )
  )
);

-- Main admins may change listing review status; city managers cannot alter
-- rows outside their assigned city and ordinary members cannot approve loads.
DROP POLICY IF EXISTS loads_main_admin_review_update ON public.loads;
DROP POLICY IF EXISTS loads_city_manager_review_update ON public.loads;

CREATE POLICY loads_main_admin_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());

CREATE POLICY loads_city_manager_review_update
ON public.loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.loads.city OR au.city = public.loads.city)
  )
);

-- Main admins need member visibility for global membership review.
DROP POLICY IF EXISTS members_main_admin_read_all ON public.members;
CREATE POLICY members_main_admin_read_all
ON public.members
FOR SELECT
TO authenticated
USING (public.terrabar_is_main_admin());

-- City managers can read member profiles only in their assigned cities.
DROP POLICY IF EXISTS members_city_manager_read_assigned_city ON public.members;
CREATE POLICY members_city_manager_read_assigned_city
ON public.members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = public.members.city OR au.city = public.members.city)
  )
);

-- City managers can review membership requests only for members in assigned cities.
DROP POLICY IF EXISTS member_roles_city_manager_read ON public.member_roles;
CREATE POLICY member_roles_city_manager_read
ON public.member_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
);

DROP POLICY IF EXISTS member_roles_city_manager_update ON public.member_roles;
CREATE POLICY member_roles_city_manager_update
ON public.member_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
)
WITH CHECK (
  approval_status IN ('approved', 'rejected')
  AND (
    (approval_status = 'approved' AND approved_by = (SELECT auth.uid()) AND approved_at IS NOT NULL)
    OR (approval_status = 'rejected' AND approved_by IS NULL AND approved_at IS NULL)
  )
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    JOIN public.admin_users AS au ON au.auth_user_id = (SELECT auth.uid())
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE m.id = public.member_roles.member_id
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = m.city OR au.city = m.city)
  )
);

-- The review UI only needs to change approval fields, never the member, role or IDs.
REVOKE UPDATE ON TABLE public.member_roles FROM authenticated;
GRANT UPDATE (approval_status, approved_by, approved_at) ON TABLE public.member_roles TO authenticated;

-- Reset broad grants first. RLS alone is not a substitute for SQL privileges.
-- The current project had broad table grants for anon and authenticated users.
REVOKE ALL PRIVILEGES ON TABLE public.members, public.member_roles, public.loads
FROM anon, authenticated;

-- Authenticated users can read rows only when RLS permits them.
GRANT SELECT ON TABLE public.members, public.member_roles TO authenticated;

-- Seller contact numbers are intentionally excluded from ordinary marketplace
-- SELECT privileges; buyer/seller communication must go through the market flow.
GRANT SELECT (
  id, name, quantity, city, role, product_type, origin, engine, source_market,
  price, price_unit, quality, description, ready_date, status, member_id,
  created_at, updated_at, min_quantity, unit, owner_member_id, seller_type,
  source_region, sale_type, min_order_quantity, count
) ON TABLE public.loads TO authenticated;

-- A new profile may only be inserted with the fields used by the membership form.
GRANT INSERT (auth_user_id, full_name, phone, city, role, verification_status, products)
ON TABLE public.members TO authenticated;

-- Members may request roles; RLS enforces self + pending-only submission.
GRANT INSERT (member_id, role_code, approval_status, approved_by, approved_at)
ON TABLE public.member_roles TO authenticated;

-- Only the announcement fields needed by the form can be inserted into loads.
GRANT INSERT (
  name, quantity, city, role, product_type, origin, engine, price, price_unit,
  quality, description, ready_date, status, member_id, contact_phone, min_quantity,
  unit, owner_member_id, seller_type, source_region, sale_type, min_order_quantity, count
) ON TABLE public.loads TO authenticated;

-- Review screens may only change role approval metadata or a load's status.
GRANT UPDATE (approval_status, approved_by, approved_at)
ON TABLE public.member_roles TO authenticated;
GRANT UPDATE (status) ON TABLE public.loads TO authenticated;


-- Let a member resubmit a previously rejected role request without creating
-- a duplicate (member_id, role_code) row. This does not allow self-approval.
DROP POLICY IF EXISTS member_roles_resubmit_rejected_self ON public.member_roles;
CREATE POLICY member_roles_resubmit_rejected_self
ON public.member_roles
FOR UPDATE
TO authenticated
USING (
  approval_status = 'rejected'
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    WHERE m.id = public.member_roles.member_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  approval_status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.members AS m
    WHERE m.id = public.member_roles.member_id
      AND m.auth_user_id = (SELECT auth.uid())
  )
);


-- Direct multi-product sourcing requests use the existing purchase_requests table.
-- A direct sourcing request has no load_id and is routed to the requester's city.
DROP POLICY IF EXISTS purchase_requests_read_authorized ON public.purchase_requests;
CREATE POLICY purchase_requests_read_authorized
ON public.purchase_requests
FOR SELECT
TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1
    FROM public.members AS buyer
    WHERE buyer.id = public.purchase_requests.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (
        auc.city_name = public.purchase_requests.destination_city
        OR au.city = public.purchase_requests.destination_city
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
    FROM public.members AS buyer
    WHERE buyer.id = public.purchase_requests.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
      AND COALESCE(buyer.role, '') IN ('buyer', 'special_buyer', 'professional_buyer')
      AND (
        public.purchase_requests.destination_city IS NULL
        OR public.purchase_requests.destination_city = buyer.city
      )
  )
);

-- Client access is restricted to the exact fields used by the direct-order form.
REVOKE ALL PRIVILEGES ON TABLE public.purchase_requests FROM anon, authenticated;
GRANT SELECT (
  id, buyer_member_id, product_type, quantity, quantity_unit, destination_city,
  quality_requirements, needed_by, notes, status, created_at, updated_at, load_id
) ON TABLE public.purchase_requests TO authenticated;
GRANT INSERT (
  buyer_member_id, product_type, quantity, quantity_unit, destination_city,
  quality_requirements, needed_by, notes, status, load_id
) ON TABLE public.purchase_requests TO authenticated;


-- Owners can deactivate their own listings, but cannot approve or reactivate them.
DROP POLICY IF EXISTS loads_owner_deactivate_update ON public.loads;
CREATE POLICY loads_owner_deactivate_update
ON public.loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members AS owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = public.loads.member_id OR owner.id = public.loads.owner_member_id)
  )
)
WITH CHECK (
  status IN ('inactive', 'pending')
  AND EXISTS (
    SELECT 1 FROM public.members AS owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = public.loads.member_id OR owner.id = public.loads.owner_member_id)
  )
);


-- Order requests from a published load: buyer submits a pending request,
-- seller can accept or reject it. Payment and delivery confirmation remain separate steps.
DROP POLICY IF EXISTS orders_read_authorized ON public.orders;
CREATE POLICY orders_read_authorized
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1 FROM public.members AS buyer
    WHERE buyer.id = public.orders.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.members AS seller
    WHERE seller.id = public.orders.seller_member_id
      AND seller.auth_user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_users AS au
    LEFT JOIN public.admin_user_cities AS auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (
        auc.city_name = public.orders.customer_city
        OR au.city = public.orders.customer_city
      )
  )
);

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
  AND delivery_type IN ('terrabar', 'pickup', 'buyer_carrier')
  AND (delivery_type = 'pickup' OR NULLIF(btrim(delivery_address), '') IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.members AS buyer
    WHERE buyer.id = public.orders.buyer_member_id
      AND buyer.auth_user_id = (SELECT auth.uid())
      AND customer_name = buyer.full_name
      AND customer_phone = buyer.phone
      AND customer_city = buyer.city
      AND (
        buyer.role = 'buyer'
        OR EXISTS (
          SELECT 1 FROM public.member_roles AS mr
          WHERE mr.member_id = buyer.id
            AND mr.role_code IN ('buyer', 'special_buyer', 'professional_buyer')
            AND (mr.role_code = 'buyer' OR mr.approval_status = 'approved')
        )
      )
  )
  AND EXISTS (
    SELECT 1
    FROM public.loads AS l
    WHERE l.id = public.orders.load_id
      AND l.status = 'active'
      AND l.member_id = public.orders.seller_member_id
      AND quantity >= COALESCE(l.min_order_quantity, 1)
      AND quantity <= COALESCE(l.count, 0)
      AND price = l.price
      AND total_price = quantity * GREATEST(1, round(l.quantity / NULLIF(l.count, 0))) * l.price
  )
);

DROP POLICY IF EXISTS orders_seller_review_update ON public.orders;
CREATE POLICY orders_seller_review_update
ON public.orders
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.members AS seller
    WHERE seller.id = public.orders.seller_member_id
      AND seller.auth_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND EXISTS (
    SELECT 1 FROM public.members AS seller
    WHERE seller.id = public.orders.seller_member_id
      AND seller.auth_user_id = (SELECT auth.uid())
  )
);

REVOKE ALL PRIVILEGES ON TABLE public.orders FROM anon, authenticated;
GRANT SELECT (
  id, load_id, customer_name, customer_city, quantity, unit, price, total_price,
  delivery_address, delivery_type, status, notes, created_at, updated_at,
  buyer_member_id, seller_member_id
) ON TABLE public.orders TO authenticated;
GRANT INSERT (
  load_id, customer_name, customer_phone, customer_city, quantity, unit, price,
  total_price, delivery_address, delivery_type, status, notes, buyer_member_id, seller_member_id
) ON TABLE public.orders TO authenticated;
GRANT UPDATE (status) ON TABLE public.orders TO authenticated;
