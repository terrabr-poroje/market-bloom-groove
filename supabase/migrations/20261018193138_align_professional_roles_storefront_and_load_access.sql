-- Align role semantics, remove permissive policy overlap, and enable secure storefront/image flows.
BEGIN;

DROP POLICY IF EXISTS loads_select_enabled_sales_tiers ON public.loads;
DROP POLICY IF EXISTS loads_select_authorized ON public.loads;

CREATE POLICY loads_select_authorized
ON public.loads
FOR SELECT
TO authenticated
USING (
  terrabar_is_main_admin()
  OR EXISTS (
    SELECT 1
    FROM public.admin_users au
    LEFT JOIN public.admin_user_cities auc ON auc.admin_user_id = au.id
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.admin_role = 'city_manager'
      AND au.is_active = true
      AND (auc.city_name = loads.city OR au.city = loads.city)
  )
  OR EXISTS (
    SELECT 1 FROM public.members owner
    WHERE owner.auth_user_id = (SELECT auth.uid())
      AND (owner.id = loads.member_id OR owner.id = loads.owner_member_id)
  )
  OR (
    loads.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.auth_user_id = (SELECT auth.uid())
        AND (
          (
            (
              lower(COALESCE(loads.seller_type, loads.role, '')) = 'supplier'
              OR lower(COALESCE(loads.sale_type, '')) IN ('professional', 'pro')
            )
            AND EXISTS (
              SELECT 1 FROM public.member_roles mr
              WHERE mr.member_id = m.id
                AND mr.approval_status = 'approved'
                AND lower(mr.role_code) IN ('supplier', 'bar_seller', 'seller')
            )
          )
          OR (
            m.city = loads.city
            AND lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special')
          )
        )
    )
  )
);

DROP POLICY IF EXISTS loads_owner_edit_own ON public.loads;
CREATE POLICY loads_owner_edit_own
ON public.loads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND m.id = loads.member_id
      AND (loads.owner_member_id IS NULL OR loads.owner_member_id = m.id)
      AND mr.approval_status = 'approved'
      AND (
        (lower(mr.role_code) = 'supplier' AND lower(COALESCE(loads.sale_type, '')) IN ('professional', 'pro'))
        OR (lower(mr.role_code) IN ('bar_seller', 'seller') AND lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special'))
      )
  )
)
WITH CHECK (
  status IN ('active', 'inactive', 'pending')
  AND EXISTS (
    SELECT 1
    FROM public.members m
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND m.id = loads.member_id
      AND (loads.owner_member_id IS NULL OR loads.owner_member_id = m.id)
      AND mr.approval_status = 'approved'
      AND (
        (lower(mr.role_code) = 'supplier' AND lower(COALESCE(loads.sale_type, '')) IN ('professional', 'pro'))
        OR (lower(mr.role_code) IN ('bar_seller', 'seller') AND lower(COALESCE(loads.sale_type, 'regular')) IN ('regular', 'retail', 'wholesale', 'special'))
      )
  )
);

DROP POLICY IF EXISTS load_price_tiers_insert_owned_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_insert_owned_loads
ON public.load_price_tiers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE l.id = load_price_tiers.load_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
      AND mr.approval_status = 'approved'
      AND (
        (lower(mr.role_code) = 'supplier' AND lower(load_price_tiers.sale_type) IN ('professional', 'pro'))
        OR (lower(mr.role_code) IN ('bar_seller', 'seller') AND lower(load_price_tiers.sale_type) IN ('regular', 'retail', 'wholesale', 'special'))
      )
  )
);

DROP POLICY IF EXISTS load_price_tiers_update_owned_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_update_owned_loads
ON public.load_price_tiers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    WHERE l.id = load_price_tiers.load_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE l.id = load_price_tiers.load_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
      AND mr.approval_status = 'approved'
      AND (
        (lower(mr.role_code) = 'supplier' AND lower(load_price_tiers.sale_type) IN ('professional', 'pro'))
        OR (lower(mr.role_code) IN ('bar_seller', 'seller') AND lower(load_price_tiers.sale_type) IN ('regular', 'retail', 'wholesale', 'special'))
      )
  )
);

DROP POLICY IF EXISTS terrabar_load_images_insert_owned ON storage.objects;
CREATE POLICY terrabar_load_images_insert_owned
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'terrabar-load-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    WHERE l.id::text = (storage.foldername(name))[2]
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
  )
);

DROP POLICY IF EXISTS terrabar_load_images_read_visible ON storage.objects;
CREATE POLICY terrabar_load_images_read_visible
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'terrabar-load-images'
  AND EXISTS (
    SELECT 1
    FROM public.load_images li
    JOIN public.loads l ON l.id = li.load_id
    WHERE li.storage_path = storage.objects.name
  )
);

DROP POLICY IF EXISTS terrabar_load_images_delete_owned ON storage.objects;
CREATE POLICY terrabar_load_images_delete_owned
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'terrabar-load-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    WHERE l.id::text = (storage.foldername(name))[2]
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
  )
);

DROP POLICY IF EXISTS load_images_insert_owned_loads ON public.load_images;
CREATE POLICY load_images_insert_owned_loads
ON public.load_images
FOR INSERT
TO authenticated
WITH CHECK (
  (storage.foldername(load_images.storage_path))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.loads l
    JOIN public.members m ON m.id = l.member_id
    WHERE l.id = load_images.load_id
      AND m.auth_user_id = (SELECT auth.uid())
      AND (l.owner_member_id IS NULL OR l.owner_member_id = m.id)
  )
);

CREATE OR REPLACE FUNCTION public.get_storefront_member(p_member_id uuid)
RETURNS TABLE(id uuid, full_name text, city text, role text, verification_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.get_storefront_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storefront_member(uuid) TO authenticated;

COMMIT;
