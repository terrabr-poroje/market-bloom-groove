-- Historical migration reconstructed from the existing production migration ledger.
-- Already applied to the original Terrabar Supabase project.
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS login_username text;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS display_name text;
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_login_username_unique ON public.admin_users (lower(login_username)) WHERE login_username IS NOT NULL;
