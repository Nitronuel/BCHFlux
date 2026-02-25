-- Add futures and margin fields to the orders table

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS leverage NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS margin NUMERIC,
ADD COLUMN IF NOT EXISTS liquidation_price NUMERIC,
ADD COLUMN IF NOT EXISTS entry_price NUMERIC;

-- Optionally, add a constraint to ensure leverage is always >= 1
ALTER TABLE public.orders 
ADD CONSTRAINT check_leverage_min CHECK (leverage >= 1);
