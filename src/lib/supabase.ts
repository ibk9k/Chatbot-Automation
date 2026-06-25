import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.warn(
    'WARNING: SUPABASE_URL environment variable is missing. Database calls will fail.'
  );
}

if (!supabaseServiceKey) {
  console.warn(
    'WARNING: SUPABASE_SERVICE_KEY environment variable is missing. Database calls will fail.'
  );
}

// We use the service role key to bypass Row Level Security (RLS) on our backend API routes.
// This is secure because the API routes run on the serverless backend.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-id.supabase.co',
  supabaseServiceKey || 'placeholder-service-key-value',
  {
    auth: {
      persistSession: false,
    },
  }
);
