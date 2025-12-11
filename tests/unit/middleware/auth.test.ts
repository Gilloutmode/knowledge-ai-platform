import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from '@server/middleware/auth';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

describe('Auth Middleware', () => {
  let app: Hono;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('authMiddleware', () => {
    describe('when Supabase is not configured (demo mode allowed)', () => {
      beforeEach(() => {
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_ANON_KEY;
        // Enable demo mode explicitly
        process.env.ALLOW_DEMO_MODE = 'true';
        delete process.env.NODE_ENV; // Ensure not production
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId') }));
      });

      it('should allow requests without auth in demo mode', async () => {
        const res = await app.request('/test');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('00000000-0000-0000-0000-000000000000');
      });

      it('should set demo user context', async () => {
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ user: c.get('user'), isDemo: c.get('isDemo') }));

        const res = await app.request('/test');
        const data = await res.json();
        expect(data.user.id).toBe('00000000-0000-0000-0000-000000000000');
        expect(data.isDemo).toBe(true);
      });
    });

    describe('when Supabase is not configured (demo mode NOT allowed)', () => {
      beforeEach(() => {
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_ANON_KEY;
        // Demo mode disabled
        delete process.env.ALLOW_DEMO_MODE;
        delete process.env.NODE_ENV;
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));
      });

      it('should return 503 when demo mode not allowed', async () => {
        const res = await app.request('/test');
        expect(res.status).toBe(503);
        const data = await res.json();
        expect(data.error).toBe('Server configuration error');
        expect(data.message).toBe('Authentication service unavailable');
      });
    });

    describe('when in production environment', () => {
      beforeEach(() => {
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_ANON_KEY;
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEMO_MODE = 'true'; // Even if set, should be ignored
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));
      });

      it('should never allow demo mode in production', async () => {
        const res = await app.request('/test');
        expect(res.status).toBe(503);
        const data = await res.json();
        expect(data.error).toBe('Server configuration error');
      });
    });

    describe('when Supabase is configured', () => {
      beforeEach(() => {
        process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
        process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
      });

      it('should reject requests without Authorization header', async () => {
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test');
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain('Missing or invalid authorization header');
      });

      it('should reject requests with invalid Authorization format', async () => {
        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Invalid token' },
        });
        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain('Missing or invalid authorization header');
      });

      it('should accept valid Bearer token format', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
        };

        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: mockUser },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId'), user: c.get('user') }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer valid-token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('user-123');
        expect(data.user.email).toBe('test@example.com');
      });

      it('should reject invalid tokens', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Invalid token' },
            }),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain('Invalid token');
      });

      it('should handle token verification errors gracefully', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockRejectedValue(new Error('Network error')),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer token' },
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain('Token verification failed');
      });

      it('should set isDemo to false when authenticated normally', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
        };

        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: mockUser },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', authMiddleware);
        app.get('/test', (c) => c.json({ isDemo: c.get('isDemo') }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer valid-token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.isDemo).toBe(false);
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    describe('when Supabase is not configured (demo mode allowed)', () => {
      beforeEach(() => {
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_ANON_KEY;
        process.env.ALLOW_DEMO_MODE = 'true';
        delete process.env.NODE_ENV;
      });

      it('should set demo user in demo mode', async () => {
        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId'), isDemo: c.get('isDemo') }));

        const res = await app.request('/test');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('00000000-0000-0000-0000-000000000000');
        expect(data.isDemo).toBe(true);
      });
    });

    describe('when Supabase is not configured (demo mode NOT allowed)', () => {
      beforeEach(() => {
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_ANON_KEY;
        delete process.env.ALLOW_DEMO_MODE;
        delete process.env.NODE_ENV;
      });

      it('should continue without user context when demo mode not allowed', async () => {
        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) =>
          c.json({ userId: c.get('userId') || 'none', isDemo: c.get('isDemo') })
        );

        const res = await app.request('/test');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('none');
        expect(data.isDemo).toBe(false);
      });
    });

    describe('when Supabase is configured', () => {
      beforeEach(() => {
        process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
        process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
      });

      it('should allow requests without auth header', async () => {
        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId') || 'anonymous' }));

        const res = await app.request('/test');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('anonymous');
      });

      it('should extract user if valid token provided', async () => {
        const mockUser = {
          id: 'user-456',
          email: 'optional@example.com',
          role: 'authenticated',
        };

        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: mockUser },
              error: null,
            }),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId') }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer valid-token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('user-456');
      });

      it('should continue without user if token is invalid', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Invalid token' },
            }),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId') || 'no-user' }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('no-user');
      });

      it('should handle errors gracefully without failing', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        vi.mocked(createClient).mockReturnValue({
          auth: {
            getUser: vi.fn().mockRejectedValue(new Error('Network error')),
          },
        } as unknown as ReturnType<typeof createClient>);

        app = new Hono();
        app.use('*', optionalAuthMiddleware);
        app.get('/test', (c) => c.json({ userId: c.get('userId') || 'error-fallback' }));

        const res = await app.request('/test', {
          headers: { Authorization: 'Bearer token' },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.userId).toBe('error-fallback');
      });
    });
  });
});
