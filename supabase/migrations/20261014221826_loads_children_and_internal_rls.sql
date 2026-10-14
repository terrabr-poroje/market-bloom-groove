-- Stepwise RLS completion for load ownership, child records, and internal admin-only data.
-- Keep orders, purchase requests, social integration, outbound messages, and webhook tables
-- closed until their exact user-facing access rules are implemented.

DROP POLICY IF EXISTS loads_owner_access ON public.loads;
CREATE POLICY loads_owner_access
ON public.loads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members AS m
    WHERE m.auth_user_id = (SELECT auth.uid())
      AND (
        m.id = public.loads.member_id
        OR m.id = public.loads.owner_member_id
      )
  )
);

DROP POLICY IF EXISTS load_images_read_visible_loads ON public.load_images;
CREATE POLICY load_images_read_visible_loads
ON public.load_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    WHERE l.id = public.load_images.load_id
  )
);

DROP POLICY IF EXISTS load_images_insert_owned_loads ON public.load_images;
CREATE POLICY load_images_insert_owned_loads
ON public.load_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_images.load_id
  )
);

DROP POLICY IF EXISTS load_images_update_owned_loads ON public.load_images;
CREATE POLICY load_images_update_owned_loads
ON public.load_images
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_images.load_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_images.load_id
  )
);

DROP POLICY IF EXISTS load_images_delete_owned_loads ON public.load_images;
CREATE POLICY load_images_delete_owned_loads
ON public.load_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_images.load_id
  )
);

DROP POLICY IF EXISTS load_price_tiers_read_visible_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_read_visible_loads
ON public.load_price_tiers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    WHERE l.id = public.load_price_tiers.load_id
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
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_price_tiers.load_id
  )
);

DROP POLICY IF EXISTS load_price_tiers_update_owned_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_update_owned_loads
ON public.load_price_tiers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_price_tiers.load_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_price_tiers.load_id
  )
);

DROP POLICY IF EXISTS load_price_tiers_delete_owned_loads ON public.load_price_tiers;
CREATE POLICY load_price_tiers_delete_owned_loads
ON public.load_price_tiers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads AS l
    JOIN public.members AS m
      ON m.auth_user_id = (SELECT auth.uid())
     AND (m.id = l.member_id OR m.id = l.owner_member_id)
    WHERE l.id = public.load_price_tiers.load_id
  )
);

DROP POLICY IF EXISTS audit_logs_read_main_admin ON public.audit_logs;
CREATE POLICY audit_logs_read_main_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.terrabar_is_main_admin());

DROP POLICY IF EXISTS message_templates_main_admin_manage ON public.message_templates;
CREATE POLICY message_templates_main_admin_manage
ON public.message_templates
FOR ALL
TO authenticated
USING (public.terrabar_is_main_admin())
WITH CHECK (public.terrabar_is_main_admin());
