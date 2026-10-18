-- Remove permissive legacy policies that bypassed load ownership and duplicated signed-read access.
DROP POLICY IF EXISTS terrabar_load_images_owner_insert ON storage.objects;
DROP POLICY IF EXISTS terrabar_load_images_owner_delete ON storage.objects;
DROP POLICY IF EXISTS terrabar_load_images_owner_update ON storage.objects;
DROP POLICY IF EXISTS terrabar_load_images_active_read ON storage.objects;
