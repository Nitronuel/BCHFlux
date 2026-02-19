
-- Create streams table
CREATE TABLE IF NOT EXISTS streams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employer_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    total_allocation NUMERIC NOT NULL,
    remaining_allocation NUMERIC NOT NULL,
    token_symbol TEXT DEFAULT 'BCH',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stream_recipients table
CREATE TABLE IF NOT EXISTS stream_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    recipient_address TEXT NOT NULL,
    -- If we can link to a user, we should, but allow pure address too via 'recipient_address'
    -- recipient_user_id UUID REFERENCES auth.users(id), 
    allocation NUMERIC NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    rate_per_second NUMERIC NOT NULL,
    withdrawn_amount NUMERIC DEFAULT 0,
    last_claim_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_streams_employer ON streams(employer_id);
CREATE INDEX IF NOT EXISTS idx_stream_recipients_stream ON stream_recipients(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_recipients_address ON stream_recipients(recipient_address);
