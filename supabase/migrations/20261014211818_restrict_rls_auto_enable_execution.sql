-- Restrict execution of the SECURITY DEFINER helper that enables RLS on new public tables.
-- This migration is already applied to Terrabar's existing Supabase project.
-- Verified live ACL: postgres and service_role can execute; PUBLIC, anon and authenticated cannot.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
