import { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

/**
 * JWT Authentication Middleware
 * Verifies Supabase JWT tokens and extracts user information
 *
 * SECURITY NOTES:
 * - Demo mode is ONLY allowed in development (NODE_ENV !== 'production')
 * - In production, Supabase MUST be configured or requests will fail
 * - Set ALLOW_DEMO_MODE=true explicitly to enable demo mode in dev
 */

// Check if demo mode is allowed
function isDemoModeAllowed(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const allowDemo = process.env.ALLOW_DEMO_MODE === "true";

  // Never allow demo mode in production
  if (isProduction) {
    return false;
  }

  // In development, require explicit opt-in
  return allowDemo;
}

// Create a Supabase client for auth verification
function getAuthClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Demo user ID for development/testing only
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

// Extend Hono context to include user
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    user: {
      id: string;
      email?: string;
      role?: string;
    };
    isDemo: boolean;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const supabase = getAuthClient();

  // Handle missing Supabase configuration
  if (!supabase) {
    if (isDemoModeAllowed()) {
      logger.warn("Running in DEMO MODE - auth disabled (development only)");
      c.set("userId", DEMO_USER_ID);
      c.set("user", { id: DEMO_USER_ID });
      c.set("isDemo", true);
      return next();
    }

    // In production or when demo mode not allowed, fail the request
    logger.error("Supabase not configured and demo mode not allowed");
    return c.json(
      {
        error: "Server configuration error",
        message: "Authentication service unavailable",
      },
      503,
    );
  }

  c.set("isDemo", false);

  // Extract token from Authorization header
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Unauthorized: Missing or invalid authorization header" },
      401,
    );
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.error({ error: error?.message }, "Auth error: Invalid token");
      return c.json({ error: "Unauthorized: Invalid token" }, 401);
    }

    // Set user info in context for downstream handlers
    c.set("userId", user.id);
    c.set("user", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return next();
  } catch (error) {
    logger.error({ error }, "Auth middleware error");
    return c.json({ error: "Unauthorized: Token verification failed" }, 401);
  }
}

/**
 * Optional auth middleware - doesn't fail if no token, but extracts user if present
 * Still respects demo mode restrictions
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const supabase = getAuthClient();

  // Handle missing Supabase configuration
  if (!supabase) {
    if (isDemoModeAllowed()) {
      c.set("userId", DEMO_USER_ID);
      c.set("user", { id: DEMO_USER_ID });
      c.set("isDemo", true);
      return next();
    }

    // In production, continue without user context (routes must handle this)
    c.set("isDemo", false);
    return next();
  }

  c.set("isDemo", false);

  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No auth header, continue without user context
    return next();
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      c.set("userId", user.id);
      c.set("user", {
        id: user.id,
        email: user.email,
        role: user.role,
      });
    }
  } catch (error) {
    // Ignore auth errors in optional mode
    logger.warn({ error }, "Optional auth failed");
  }

  return next();
}

/**
 * Check if current request is in demo mode
 */
export function isRequestInDemoMode(c: Context): boolean {
  return c.get("isDemo") === true;
}

// Export for testing
export { isDemoModeAllowed, getAuthClient, DEMO_USER_ID };
