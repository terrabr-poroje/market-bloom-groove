-- Permit participants and authorized city managers to read payment/delivery progress.
-- Payment and delivery fields remain server-managed and are not writable by browser clients.
GRANT SELECT (
  payment_status, paid_at, delivery_status, shipped_at, delivered_at,
  delivery_confirmation_method
) ON TABLE public.orders TO authenticated;

REVOKE UPDATE (payment_status, payment_provider, payment_reference, paid_at,
  delivery_status, shipped_at, delivered_at, delivery_confirmation_method,
  delivery_confirmed_by) ON TABLE public.orders FROM authenticated;
