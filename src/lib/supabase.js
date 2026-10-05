import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://idrraytmjdbcgerdahkj.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
  