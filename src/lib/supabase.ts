import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://bxrlgmrnsqjruskerjol.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cmxnbXJuc3FqcnVza2Vyam9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNDM2MTMsImV4cCI6MjExMDgxOTYxM30.HskIz2oSn_lrcDZ50xKum3pbC52TlBfSGh-Pilugk6s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
