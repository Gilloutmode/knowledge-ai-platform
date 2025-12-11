import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import {
  createRateLimit,
  apiRateLimit,
  webhookRateLimit,
  strictRateLimit,
} from '@server/middleware/rateLimit';

describe('Rate Limit Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    vi.useFakeTimers();
    app = new Hono();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.1' },
        });
        expect(res.status).toBe(200);
      }
    });

    it('should block requests over the limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 3,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.2' },
        });
        expect(res.status).toBe(200);
      }

      // 4th request should be blocked
      const blocked = await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });
      expect(blocked.status).toBe(429);
      const data = await blocked.json();
      expect(data.error).toBe('Too many requests');
      expect(data.retryAfter).toBeDefined();
    });

    it('should set rate limit headers', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 10,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.3' },
      });

      expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should reset after window expires', async () => {
      const rateLimit = createRateLimit({
        windowMs: 1000, // 1 second window
        maxRequests: 2,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Use up the limit
      for (let i = 0; i < 2; i++) {
        await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.4' },
        });
      }

      // Should be blocked
      let res = await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.4' },
      });
      expect(res.status).toBe(429);

      // Advance time past the window
      vi.advanceTimersByTime(1100);

      // Should be allowed again
      res = await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.4' },
      });
      expect(res.status).toBe(200);
    });

    it('should track different IPs separately', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // IP 1 uses its quota
      for (let i = 0; i < 2; i++) {
        await app.request('/test', {
          headers: { 'x-forwarded-for': '10.0.0.1' },
        });
      }

      // IP 1 should be blocked
      const blocked = await app.request('/test', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });
      expect(blocked.status).toBe(429);

      // IP 2 should still be allowed
      const allowed = await app.request('/test', {
        headers: { 'x-forwarded-for': '10.0.0.2' },
      });
      expect(allowed.status).toBe(200);
    });

    it('should support custom key generator', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (c) => c.req.header('x-api-key') || 'default',
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Same IP but different API keys
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/test', {
          headers: { 'x-api-key': 'key-1', 'x-forwarded-for': '192.168.1.1' },
        });
        expect(res.status).toBe(200);
      }

      // key-1 blocked
      const blocked = await app.request('/test', {
        headers: { 'x-api-key': 'key-1', 'x-forwarded-for': '192.168.1.1' },
      });
      expect(blocked.status).toBe(429);

      // key-2 still allowed (same IP)
      const allowed = await app.request('/test', {
        headers: { 'x-api-key': 'key-2', 'x-forwarded-for': '192.168.1.1' },
      });
      expect(allowed.status).toBe(200);
    });

    it('should use x-real-ip header as fallback', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Use x-real-ip instead of x-forwarded-for
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/test', {
          headers: { 'x-real-ip': '172.16.0.1' },
        });
        expect(res.status).toBe(200);
      }

      const blocked = await app.request('/test', {
        headers: { 'x-real-ip': '172.16.0.1' },
      });
      expect(blocked.status).toBe(429);
    });

    it('should handle requests without IP headers', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Requests without IP headers should be tracked under 'unknown'
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/test');
        expect(res.status).toBe(200);
      }

      const blocked = await app.request('/test');
      expect(blocked.status).toBe(429);
    });

    it('should set Retry-After header when blocked', async () => {
      const rateLimit = createRateLimit({
        windowMs: 30000, // 30 seconds
        maxRequests: 1,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Use the limit
      await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.5' },
      });

      // Get blocked response
      const blocked = await app.request('/test', {
        headers: { 'x-forwarded-for': '192.168.1.5' },
      });

      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('Retry-After')).toBeDefined();
      const retryAfter = parseInt(blocked.headers.get('Retry-After') || '0');
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });
  });

  describe('Pre-configured rate limiters', () => {
    describe('apiRateLimit', () => {
      it('should allow 100 requests per minute', async () => {
        app.use('*', apiRateLimit);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.100' },
        });

        expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
      });
    });

    describe('webhookRateLimit', () => {
      it('should allow 30 requests per minute', async () => {
        app.use('*', webhookRateLimit);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.101' },
        });

        expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
      });
    });

    describe('strictRateLimit', () => {
      it('should allow 10 requests per minute', async () => {
        app.use('*', strictRateLimit);
        app.get('/test', (c) => c.json({ ok: true }));

        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.102' },
        });

        expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent requests correctly', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Send multiple concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() =>
          app.request('/test', {
            headers: { 'x-forwarded-for': '192.168.1.200' },
          })
        );

      const responses = await Promise.all(promises);
      const successCount = responses.filter((r) => r.status === 200).length;
      const blockedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount).toBe(5);
      expect(blockedCount).toBe(5);
    });

    it('should show correct remaining count', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.use('*', rateLimit);
      app.get('/test', (c) => c.json({ ok: true }));

      // Make sequential requests and check remaining count
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/test', {
          headers: { 'x-forwarded-for': '192.168.1.201' },
        });
        const remaining = parseInt(res.headers.get('X-RateLimit-Remaining') || '0');
        expect(remaining).toBe(4 - i);
      }
    });
  });
});
