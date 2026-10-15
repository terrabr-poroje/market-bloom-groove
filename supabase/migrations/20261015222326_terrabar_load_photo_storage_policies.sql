-- Keep the existing private photo bucket private. Owners may upload only under their auth-user folder.
-- Authenticated users may read objects attached to active loads to create signed image URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('terrabar-load-images', 'terrabar-load-images', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists terrabar_load_images_owner_insert on storage.objects;
create policy terrabar_load_images_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'terrabar-load-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.members m where m.auth_user_id = (select auth.uid()))
);

drop policy if exists terrabar_load_images_owner_update on storage.objects;
create policy terrabar_load_images_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'terrabar-load-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'terrabar-load-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists terrabar_load_images_owner_delete on storage.objects;
create policy terrabar_load_images_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'terrabar-load-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists terrabar_load_images_active_read on storage.objects;
create policy terrabar_load_images_active_read on storage.objects
for select to authenticated
using (
  bucket_id = 'terrabar-load-images'
  and exists (
    select 1 from public.loads l
    where l.id::text = (storage.foldername(name))[2]
      and l.status = 'active'
  )
);
