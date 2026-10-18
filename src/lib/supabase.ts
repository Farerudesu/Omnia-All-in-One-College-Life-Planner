import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Environment variable VITE_SUPABASE_URL is missing. Please set it in your .env file.');
}
if (!anonKey) {
  console.error('Environment variable VITE_SUPABASE_ANON_KEY is missing. Please set it in your .env file.');
}

export const supabase: SupabaseClient | null = (supabaseUrl && anonKey)
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
