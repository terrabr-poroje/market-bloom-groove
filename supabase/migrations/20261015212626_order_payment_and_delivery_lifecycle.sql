-- Add explicit payment and delivery lifecycle fields to orders.
-- Payment confirmation must come from a trusted gateway webhook/server, not the browser.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'awaiting_payment',
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmation_method text,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by uuid;

CREATE INDEX IF NOT EXISTS orders_payment_status_created_idx
  ON public.orders (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_delivery_status_created_idx
  ON public.orders (delivery_status, created_at DESC);

COMMENT ON COLUMN public.orders.payment_status IS
  'Payment lifecycle: unpaid, pending, paid, failed, refunded. Only trusted server/webhook may mark paid.';
COMMENT ON COLUMN public.orders.delivery_status IS
  'Delivery lifecycle: awaiting_payment, awaiting_dispatch, shipped, delivered, disputed. Updated only by trusted workflow.';
COMMENT ON COLUMN public.orders.payment_reference IS
  'Payment gateway transaction reference; never accepted from a browser client as proof of payment.';
