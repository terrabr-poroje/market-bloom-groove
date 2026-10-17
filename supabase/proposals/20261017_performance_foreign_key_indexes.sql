-- PROPOSAL ONLY — NOT an auto-applied Supabase migration.
-- Review and apply manually only after explicit approval.
-- These indexes cover the nine foreign-key columns reported unindexed by
-- Supabase Performance Advisor on 2026-10-17. They are additive and do not
-- change row-level security, grants, table data, or application behavior.
--
-- Run during a low-traffic window. Index creation can consume resources and
-- should be measured against query plans after application.

CREATE INDEX IF NOT EXISTS idx_admin_user_cities_city_name
  ON public.admin_user_cities (city_name);

CREATE INDEX IF NOT EXISTS idx_admin_users_created_by
  ON public.admin_users (created_by);

CREATE INDEX IF NOT EXISTS idx_city_neighbors_neighbor_city_name
  ON public.city_neighbors (neighbor_city_name);

CREATE INDEX IF NOT EXISTS idx_loads_member_id
  ON public.loads (member_id);

CREATE INDEX IF NOT EXISTS idx_member_roles_approved_by
  ON public.member_roles (approved_by);

CREATE INDEX IF NOT EXISTS idx_outgoing_messages_connection
  ON public.outgoing_messages (connection_id);

CREATE INDEX IF NOT EXISTS idx_social_contacts_member
  ON public.social_contacts (member_id);

CREATE INDEX IF NOT EXISTS idx_social_messages_connection
  ON public.social_messages (connection_id);

CREATE INDEX IF NOT EXISTS idx_social_posts_connection
  ON public.social_posts (connection_id);
