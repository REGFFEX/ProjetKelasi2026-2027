import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zbpolpupaybdrpmkwbkq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicG9scHVwYXliZHJwbWt3YmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNDEyMDcsImV4cCI6MjEwMDYxNzIwN30.RgJviNAU3vUosGIgk3weiFTGncLBxv8weLQeRBIn0Y0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});
