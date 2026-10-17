-- Historical migration reconstructed from the existing production migration ledger.
-- Already applied to the original Terrabar Supabase project; do not manually reapply.
DROP POLICY IF EXISTS terrabar_load_images_active_read ON storage.objects;

CREATE POLICY terrabar_load_images_active_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'terrabar-load-images'
  AND EXISTS (
    SELECT 1
    FROM public.loads l
    WHERE l.id::text = (storage.foldername(name))[2]
      AND l.status = 'active'
  )
);
