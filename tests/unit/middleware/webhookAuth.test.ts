import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

// We need to mock the environment before importing the module
const originalEnv = process.env;

describe('Webhook Auth Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when N8N_WEBHOOK_SECRET is not configured', () => {
    it('should allow all requests (development mode)', async () => {
      delete process.env.N8N_WEBHOOK_SECRET;

      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', { method: 'POST' });
      expect(res.status).toBe(200);
    });
  });

  describe('when N8N_WEBHOOK_SECRET is configured', () => {
    // Secret must be at least 32 chars for the new HMAC implementation
    const WEBHOOK_SECRET = 'super-secret-webhook-key-1234567890';

    beforeEach(async () => {
      process.env.N8N_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it('should reject requests without any secret', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', { method: 'POST' });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Missing webhook authentication');
    });

    it('should reject requests with invalid secret in header', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': 'wrong-secret' },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid webhook secret');
    });

    it('should accept valid secret in X-Webhook-Secret header', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
    });

    it('should accept valid secret in Authorization Bearer header', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
    });

    it('should reject query parameter authentication (not supported in HMAC mode)', async () => {
      // Query parameter auth was removed for security - use header-based auth instead
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request(`/webhook?secret=${WEBHOOK_SECRET}`, {
        method: 'POST',
      });

      // Query params are not accepted - must use headers
      expect(res.status).toBe(401);
    });

    it('should prefer header secret over query parameter', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      // Valid header, invalid query - should pass
      const res = await app.request('/webhook?secret=wrong', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
      });

      expect(res.status).toBe(200);
    });

    it('should work with GET requests', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.get('/webhook', (c) => c.json({ status: 'ok' }));

      const res = await app.request('/webhook', {
        headers: { 'X-Webhook-Secret': WEBHOOK_SECRET },
      });

      expect(res.status).toBe(200);
    });

    it('should handle case-sensitive secrets', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      // Secret with different case
      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': WEBHOOK_SECRET.toUpperCase() },
      });

      expect(res.status).toBe(401);
    });

    it('should handle whitespace in secrets (HTTP headers trim whitespace)', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      // Note: HTTP headers automatically trim leading/trailing whitespace
      // So this will actually match because the whitespace gets stripped
      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': `  ${WEBHOOK_SECRET}  ` },
      });

      // HTTP spec trims header values, so the secret matches
      expect(res.status).toBe(200);
    });
  });

  describe('HMAC authentication', () => {
    // Secret must be at least 32 chars
    const WEBHOOK_SECRET = 'hmac-secret-key-1234567890abcdefgh';

    beforeEach(() => {
      vi.resetModules();
      process.env.N8N_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it('should accept valid HMAC signature', async () => {
      const { webhookAuth, generateWebhookSignature } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const payload = JSON.stringify({ test: 'data' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, timestamp, WEBHOOK_SECRET);

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': timestamp.toString(),
        },
        body: payload,
      });

      expect(res.status).toBe(200);
    });

    it('should reject invalid HMAC signature', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const payload = JSON.stringify({ test: 'data' });
      const timestamp = Math.floor(Date.now() / 1000);

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'sha256=invalidsignature',
          'X-Webhook-Timestamp': timestamp.toString(),
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Invalid signature');
    });

    it('should reject expired timestamps', async () => {
      const { webhookAuth, generateWebhookSignature } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const payload = JSON.stringify({ test: 'data' });
      // Timestamp from 10 minutes ago (beyond 5 min max age)
      const timestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = generateWebhookSignature(payload, timestamp, WEBHOOK_SECRET);

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': timestamp.toString(),
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('timestamp too old');
    });
  });

  describe('Security edge cases', () => {
    // Secret must be at least 32 chars for the HMAC implementation
    const WEBHOOK_SECRET = 'secure-key-xyz-1234567890abcdefgh';

    beforeEach(() => {
      process.env.N8N_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    it('should not leak secret information in error messages', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': 'wrong' },
      });

      const data = await res.json();
      expect(JSON.stringify(data)).not.toContain(WEBHOOK_SECRET);
    });

    it('should handle empty Authorization header', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { Authorization: '' },
      });

      expect(res.status).toBe(401);
    });

    it('should handle Authorization header without Bearer prefix', async () => {
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { Authorization: WEBHOOK_SECRET },
      });

      // Without Bearer prefix, it should use the raw Authorization value
      expect(res.status).toBe(200);
    });

    it('should handle very long secrets gracefully', async () => {
      const longSecret = 'a'.repeat(10000);
      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': longSecret },
      });

      expect(res.status).toBe(401);
    });

    it('should handle special characters in secrets', async () => {
      vi.resetModules();
      // Secret with special chars, at least 32 chars
      const specialSecret = 'secret!@#$%^&*()_+-=[]{}|;:,.<>?abc';
      process.env.N8N_WEBHOOK_SECRET = specialSecret;

      const { webhookAuth } = await import('@server/middleware/webhookAuth');

      app = new Hono();
      app.use('*', webhookAuth);
      app.post('/webhook', (c) => c.json({ received: true }));

      const res = await app.request('/webhook', {
        method: 'POST',
        headers: { 'X-Webhook-Secret': specialSecret },
      });

      expect(res.status).toBe(200);
    });
  });
});
