import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, use process.env.NEXT_PUBLIC_SUPABASE_URL
// For this generated demo, we will check if they exist, otherwise we fallback to mock mode in the UI.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isMockMode = !supabase;
