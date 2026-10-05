import { createClient } from '@supabase/supabase-js';

const rawUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n\t\s]/g, '').trim();

if (!rawKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables. Set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.');
}

const supabaseUrl = rawUrl;
const supabaseKey = rawKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
