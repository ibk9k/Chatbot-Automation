-- Supabase Database Schema Setup for Multi-Client Chatbot Service
-- Paste this SQL into the Supabase SQL Editor and click "Run".

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,                       -- Unique identifier, e.g. 'craftsfabrics' or 'test-client'
    name TEXT NOT NULL,                        -- Human readable name
    system_prompt TEXT NOT NULL,               -- System prompt (personality definition) for the bot
    allowed_domain TEXT NOT NULL,             -- Domain the widget runs on, e.g. 'craftsfabrics.com'
    monthly_limit INTEGER NOT NULL DEFAULT 1000,-- Maximum messages allowed per month
    messages_used INTEGER NOT NULL DEFAULT 0,  -- Count of messages sent this month
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    message TEXT NOT NULL,                     -- Message sent by user
    response TEXT,                             -- AI response text
    origin TEXT,                               -- Request origin header (useful for troubleshooting)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create helper function to increment message count atomically
CREATE OR REPLACE FUNCTION increment_messages_used(client_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET messages_used = messages_used + 1
  WHERE id = client_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
-- We enable RLS but do not add public read/write policies.
-- This restricts anonymous/authenticated public keys from viewing details,
-- while allowing our backend (using the service role key) to bypass RLS.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 5. Insert local testing client
-- This client matches the local testing environment setup in public/test-widget.html
INSERT INTO public.clients (id, name, system_prompt, allowed_domain, monthly_limit, messages_used)
VALUES (
    'test-client',
    'Local Test Client',
    'You are a helpful and polite test assistant for the local chatbot sandbox. Keep answers short and friendly, and reference that you are running in test mode.',
    'localhost',
    5,
    0
) ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    system_prompt = EXCLUDED.system_prompt,
    allowed_domain = EXCLUDED.allowed_domain,
    monthly_limit = EXCLUDED.monthly_limit;
