-- Add chain metadata to orders table for accurate price fetching
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS chain_id TEXT,
ADD COLUMN IF NOT EXISTS pair_address TEXT;

-- Optional: Add index for faster matching queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pair ON public.orders(chain_id, pair_address);
