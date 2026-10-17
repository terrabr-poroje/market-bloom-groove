-- Historical migration reconstructed from the existing production migration ledger.
-- Already applied to the original Terrabar Supabase project; do not manually reapply.
GRANT SELECT, INSERT ON TABLE public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.loads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.purchase_requests TO authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;
GRANT SELECT ON TABLE public.admin_user_cities TO authenticated;
GRANT SELECT ON TABLE public.cities TO authenticated;
GRANT SELECT ON TABLE public.city_neighbors TO authenticated;
