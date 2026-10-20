-- Reversible archive for Terrabar members and loads. Orders and financial records remain untouched.
alter table public.members
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

alter table public.loads
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id),
  add column if not exists archived_previous_status text;

create or replace function public.terrabar_admin_archive_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
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
  update public.members set is_archived = true, archived_at = now(), archived_by = auth.uid()
  where id = p_member_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'archive', 'member', p_member_id, jsonb_build_object('city', v_city));
end; $$;

create or replace function public.terrabar_admin_restore_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare v_city text;
begin
  select city into v_city from public.members where id = p_member_id and is_archived = true for update;
  if not found then raise exception 'عضو بایگانی‌شده پیدا نشد'; end if;
  if not public.terrabar_is_main_admin() then raise exception 'بازگردانی اعضا فقط با دسترسی مدیر کل مجاز است'; end if;
  update public.members set is_archived = false, archived_at = null, archived_by = null where id = p_member_id;
  insert into public.audit_logs(actor_member_id, action, entity_type, entity_id, details)
  values ((select id from public.members where auth_user_id = auth.uid() limit 1), 'restore', 'member', p_member_id, jsonb_build_object('city', v_city));
end; $$;

create or replace function public.terrabar_admin_archive_load(p_load_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
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

create or replace function public.terrabar_admin_restore_load(p_load_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
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

revoke all on function public.terrabar_admin_archive_member(uuid) from public, anon;
revoke all on function public.terrabar_admin_restore_member(uuid) from public, anon;
revoke all on function public.terrabar_admin_archive_load(uuid) from public, anon;
revoke all on function public.terrabar_admin_restore_load(uuid) from public, anon;
grant execute on function public.terrabar_admin_archive_member(uuid) to authenticated;
grant execute on function public.terrabar_admin_restore_member(uuid) to authenticated;
grant execute on function public.terrabar_admin_archive_load(uuid) to authenticated;
grant execute on function public.terrabar_admin_restore_load(uuid) to authenticated;
