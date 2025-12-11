import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates all required and optional env vars at startup
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Supabase (required for production, optional for demo mode)
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // External APIs (optional - features disabled if not set)
  GEMINI_API_KEY: z.string().min(1).optional(),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  NANO_BANANA_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),

  // N8N Webhooks (optional)
  N8N_WEBHOOK_BASE_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Security
  ALLOW_DEMO_MODE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ALLOWED_ORIGINS: z.string().optional(),

  // Redis (optional - falls back to in-memory cache)
  REDIS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Throws descriptive error if validation fails
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  - ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    console.error('\n❌ Environment validation failed:\n');
    console.error(errorMessages);
    console.error('\n💡 Check your .env.local file and ensure all required variables are set.\n');

    // In development, show what's missing
    if (process.env.NODE_ENV !== 'production') {
      console.error('Current values:');
      Object.keys(envSchema.shape).forEach((key) => {
        const value = process.env[key];
        const masked = value
          ? key.includes('KEY') || key.includes('SECRET')
            ? '[REDACTED]'
            : value.substring(0, 20) + (value.length > 20 ? '...' : '')
          : '(not set)';
        console.error(`  ${key}: ${masked}`);
      });
    }

    throw new Error('Environment validation failed');
  }

  return result.data;
}

// Singleton validated env
let _env: Env | null = null;

/**
 * Get validated environment variables
 * Call this at server startup to validate early
 */
export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if demo mode is allowed
 */
export function isDemoModeAllowed(): boolean {
  const env = getEnv();
  // Demo mode only allowed in development with explicit flag
  return !isProduction() && env.ALLOW_DEMO_MODE;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  const env = getEnv();
  return !!(env.VITE_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY));
}

/**
 * Get feature availability based on configured APIs
 */
export function getFeatureFlags(): {
  supabase: boolean;
  gemini: boolean;
  youtube: boolean;
  n8n: boolean;
  elevenlabs: boolean;
  imageGeneration: boolean;
  email: boolean;
} {
  const env = getEnv();
  return {
    supabase: isSupabaseConfigured(),
    gemini: !!env.GEMINI_API_KEY,
    youtube: !!env.YOUTUBE_API_KEY,
    n8n: !!env.N8N_WEBHOOK_BASE_URL,
    elevenlabs: !!env.ELEVENLABS_API_KEY,
    imageGeneration: !!env.NANO_BANANA_API_KEY,
    email: !!env.RESEND_API_KEY,
  };
}
