ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS infinitepay_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS infinitepay_handle text;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_receipt_url text;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS payment_transaction_nsu text;