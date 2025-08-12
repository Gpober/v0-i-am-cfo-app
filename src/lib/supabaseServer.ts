import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * to be set in Vercel Project → Settings → Environment Variables.
 */
export const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

