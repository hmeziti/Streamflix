import { createClient } from '@supabase/supabase-js';

// Variables lues au build par Vite (voir .env.example). Sans elles, l'app tourne en mode démo.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isMockMode = !supabase;
