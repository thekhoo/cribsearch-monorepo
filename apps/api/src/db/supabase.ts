import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseConfig } from "../shared/config/ssm";

let client: SupabaseClient | null = null;

/**
 * Initialises the Supabase client by resolving credentials (from env vars
 * locally, or SSM in Lambda). Must be called once during cold-start init
 * before any handler runs.
 */
export const initSupabase = async (): Promise<void> => {
  if (client) return;
  const { supabaseUrl, supabaseServiceRoleKey } =
    await resolveSupabaseConfig();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally, or provision SSM parameters in production.",
    );
  }

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

/**
 * Returns the Supabase client. Throws if `initSupabase()` has not been called.
 * Server-side only — the service-role key bypasses Row Level Security.
 */
export const getSupabase = (): SupabaseClient => {
  if (!client) {
    throw new Error("Supabase not initialised. Call initSupabase() first.");
  }
  return client;
};
