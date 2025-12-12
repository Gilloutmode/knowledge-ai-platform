import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv, isSupabaseConfigured } from "./env";
import { logger } from "./logger";

// Lazy-initialized Supabase client
let _supabase: SupabaseClient | null = null;
let _initialized = false;

/**
 * Get Supabase client instance
 * Returns null if Supabase is not configured (demo mode)
 */
export function getSupabase(): SupabaseClient | null {
  if (!_initialized) {
    _initialized = true;

    if (!isSupabaseConfigured()) {
      logger.warn("Supabase not configured - database features disabled");
      return null;
    }

    const env = getEnv();
    const supabaseUrl = env.VITE_SUPABASE_URL!;
    const supabaseKey =
      env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY!;

    _supabase = createClient(supabaseUrl, supabaseKey);
    logger.info("Supabase client initialized");
  }

  return _supabase;
}

/**
 * Check if running in demo mode (no Supabase)
 */
export function isDemoMode(): boolean {
  return getSupabase() === null;
}
