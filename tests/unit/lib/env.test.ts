import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset modules to clear cached env
    vi.resetModules();
    // Set minimal valid env
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PORT: '3001',
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getEnv', () => {
    it('should return validated environment with defaults', async () => {
      const { getEnv } = await import('../../../server/lib/env');
      const env = getEnv();

      expect(env.NODE_ENV).toBe('test');
      expect(env.PORT).toBe(3001);
      expect(env.LOG_LEVEL).toBe('info'); // default
      expect(env.ALLOW_DEMO_MODE).toBe(false); // default
    });

    it('should parse PORT as number', async () => {
      process.env.PORT = '8080';
      const { getEnv } = await import('../../../server/lib/env');
      const env = getEnv();

      expect(env.PORT).toBe(8080);
      expect(typeof env.PORT).toBe('number');
    });

    it('should parse ALLOW_DEMO_MODE as boolean', async () => {
      process.env.ALLOW_DEMO_MODE = 'true';
      const { getEnv } = await import('../../../server/lib/env');
      const env = getEnv();

      expect(env.ALLOW_DEMO_MODE).toBe(true);
    });

    it('should accept valid NODE_ENV values', async () => {
      for (const nodeEnv of ['development', 'production', 'test']) {
        vi.resetModules();
        process.env.NODE_ENV = nodeEnv;
        const { getEnv } = await import('../../../server/lib/env');
        const env = getEnv();
        expect(env.NODE_ENV).toBe(nodeEnv);
      }
    });

    it('should accept valid LOG_LEVEL values', async () => {
      for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
        vi.resetModules();
        process.env.LOG_LEVEL = level;
        const { getEnv } = await import('../../../server/lib/env');
        const env = getEnv();
        expect(env.LOG_LEVEL).toBe(level);
      }
    });
  });

  describe('isProduction', () => {
    it('should return true in production', async () => {
      process.env.NODE_ENV = 'production';
      const { isProduction } = await import('../../../server/lib/env');
      expect(isProduction()).toBe(true);
    });

    it('should return false in development', async () => {
      process.env.NODE_ENV = 'development';
      const { isProduction } = await import('../../../server/lib/env');
      expect(isProduction()).toBe(false);
    });
  });

  describe('isDemoModeAllowed', () => {
    it('should return false in production even with flag', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_DEMO_MODE = 'true';
      const { isDemoModeAllowed } = await import('../../../server/lib/env');
      expect(isDemoModeAllowed()).toBe(false);
    });

    it('should return true in development with flag', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_DEMO_MODE = 'true';
      const { isDemoModeAllowed } = await import('../../../server/lib/env');
      expect(isDemoModeAllowed()).toBe(true);
    });

    it('should return false in development without flag', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_DEMO_MODE = 'false';
      const { isDemoModeAllowed } = await import('../../../server/lib/env');
      expect(isDemoModeAllowed()).toBe(false);
    });
  });

  describe('isSupabaseConfigured', () => {
    it('should return true when URL and key are set', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      const { isSupabaseConfigured } = await import('../../../server/lib/env');
      expect(isSupabaseConfigured()).toBe(true);
    });

    it('should return true with service role key', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
      delete process.env.VITE_SUPABASE_ANON_KEY;
      const { isSupabaseConfigured } = await import('../../../server/lib/env');
      expect(isSupabaseConfigured()).toBe(true);
    });

    it('should return false when URL is missing', async () => {
      delete process.env.VITE_SUPABASE_URL;
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      const { isSupabaseConfigured } = await import('../../../server/lib/env');
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('getFeatureFlags', () => {
    it('should detect available features', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'gemini-key';
      process.env.YOUTUBE_API_KEY = 'youtube-key';
      process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n.example.com/webhook';

      const { getFeatureFlags } = await import('../../../server/lib/env');
      const flags = getFeatureFlags();

      expect(flags.supabase).toBe(true);
      expect(flags.gemini).toBe(true);
      expect(flags.youtube).toBe(true);
      expect(flags.n8n).toBe(true);
      expect(flags.elevenlabs).toBe(false);
      expect(flags.imageGeneration).toBe(false);
      expect(flags.email).toBe(false);
    });

    it('should detect missing features', async () => {
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.GEMINI_API_KEY;

      const { getFeatureFlags } = await import('../../../server/lib/env');
      const flags = getFeatureFlags();

      expect(flags.supabase).toBe(false);
      expect(flags.gemini).toBe(false);
    });
  });
});
