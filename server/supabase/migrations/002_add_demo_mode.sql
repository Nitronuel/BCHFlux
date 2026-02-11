-- Migration: Add Demo Mode Support
-- Run this in Supabase SQL Editor

-- 1. Update Balances Table
ALTER TABLE public.balances ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Drop old unique constraint (user_id, token_symbol) and add new one including is_demo
ALTER TABLE public.balances DROP CONSTRAINT IF EXISTS balances_user_id_token_symbol_key;
ALTER TABLE public.balances ADD CONSTRAINT balances_user_id_token_symbol_is_demo_key UNIQUE (user_id, token_symbol, is_demo);

-- 2. Update Orders Table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- 3. Update User Onboarding Trigger (to give Demo funds)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    -- Create DEMO Balances for new user
    INSERT INTO public.balances (user_id, token_symbol, available, is_demo)
    VALUES 
        (NEW.id, 'USDT', 10000, TRUE),
        (NEW.id, 'BCH', 10, TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill Demo Balances for EXISTING users (if any)
INSERT INTO public.balances (user_id, token_symbol, available, is_demo)
SELECT id, 'USDT', 10000, TRUE FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.balances (user_id, token_symbol, available, is_demo)
SELECT id, 'BCH', 10, TRUE FROM auth.users
ON CONFLICT DO NOTHING;
