-- Add indexes for foreign-key lookups used by marketplace, orders, ratings, and member operations.
-- These are additive and safe for existing production data.
CREATE INDEX IF NOT EXISTS idx_admin_user_cities_city_name ON public.admin_user_cities (city_name);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON public.admin_users (created_by);
CREATE INDEX IF NOT EXISTS idx_city_neighbors_neighbor_city_name ON public.city_neighbors (neighbor_city_name);
CREATE INDEX IF NOT EXISTS idx_loads_member_id ON public.loads (member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_approved_by ON public.member_roles (approved_by);
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_connection_id ON public.outgoing_messages (connection_id);
CREATE INDEX IF NOT EXISTS idx_rating_messages_sender_user_id ON public.rating_messages (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_member_id ON public.ratings (reviewer_member_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_load_id ON public.ratings (target_load_id);
CREATE INDEX IF NOT EXISTS idx_ratings_target_member_id ON public.ratings (target_member_id);
CREATE INDEX IF NOT EXISTS idx_seller_financial_transactions_order_id ON public.seller_financial_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_member_id ON public.site_visits (member_id);
CREATE INDEX IF NOT EXISTS idx_social_contacts_member_id ON public.social_contacts (member_id);
CREATE INDEX IF NOT EXISTS idx_social_messages_connection_id ON public.social_messages (connection_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_connection_id ON public.social_posts (connection_id);
