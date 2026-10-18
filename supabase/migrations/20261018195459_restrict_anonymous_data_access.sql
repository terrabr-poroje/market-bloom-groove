-- Remove default anonymous privileges from private marketplace, admin, finance, rating, and analytics data.
REVOKE ALL PRIVILEGES ON TABLE
  public.admin_user_cities,
  public.cities,
  public.city_neighbors,
  public.load_images,
  public.load_price_tiers,
  public.ratings,
  public.rating_messages,
  public.seller_bank_accounts,
  public.seller_financial_transactions,
  public.site_visits,
  public.site_visit_summary
FROM anon;

GRANT SELECT ON TABLE public.admin_user_cities, public.cities, public.city_neighbors, public.site_visit_summary TO authenticated;

-- This view must enforce the caller's RLS on site_visits, so only admins can read aggregate visits.
ALTER VIEW public.site_visit_summary SET (security_invoker = true);
