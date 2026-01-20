import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get the Supabase admin client with lazy initialization
 * This ensures the client is only created when needed and env vars are available
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminInstance;
}

/**
 * @deprecated Use getSupabaseAdmin() instead for lazy initialization
 */
export const supabaseAdmin = {
  get auth() {
    return getSupabaseAdmin().auth;
  },
  from(table: string) {
    return getSupabaseAdmin().from(table);
  },
};
