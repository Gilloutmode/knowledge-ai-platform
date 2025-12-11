import { config } from 'dotenv';
// Load .env.local first, then .env as fallback
config({ path: '.env.local' });
config({ path: '.env' });

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { channelsRouter } from './routes/channels';
import { videosRouter } from './routes/videos';
import { analysesRouter } from './routes/analyses';
import { webhooksRouter } from './routes/webhooks';
import { healthRouter } from './routes/health';
import { searchRouter } from './routes/search';
import {
  apiRateLimit,
  optionalAuthMiddleware,
  securityHeaders,
  requestId,
  pinoLogger,
} from './middleware';
import { logger } from './lib/logger';
import { getEnv, isProduction, isDemoModeAllowed, getFeatureFlags } from './lib/env';

// Validate environment at startup (fails fast if invalid)
const env = getEnv();

const app = new Hono();

// Security headers (first, so all responses have them)
app.use('*', securityHeaders);

// Request ID for tracing
app.use('*', requestId);

// Structured logging with Pino
app.use('*', pinoLogger);

// CORS - configure based on environment
const allowedOrigins = isProduction()
  ? env.ALLOWED_ORIGINS?.split(',') || ['https://youtube-learning.app']
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret'],
    exposeHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400, // 24 hours
  })
);

// Rate limiting for all API routes
app.use('/api/*', apiRateLimit);

// Optional auth - extracts user if token provided, continues without if not
app.use('/api/channels/*', optionalAuthMiddleware);
app.use('/api/videos/*', optionalAuthMiddleware);
app.use('/api/analyses/*', optionalAuthMiddleware);

// Health check routes (no auth required)
app.route('/health', healthRouter);

// API Routes
app.route('/api/channels', channelsRouter);
app.route('/api/videos', videosRouter);
app.route('/api/analyses', analysesRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/search', searchRouter);

// Error handling - don't leak internal details in production
app.onError((err, c) => {
  const reqId = c.get('requestId');

  // Structured error logging
  logger.error(
    {
      requestId: reqId,
      error: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    },
    'Unhandled server error'
  );

  if (isProduction()) {
    return c.json(
      {
        error: 'Internal server error',
        requestId: reqId,
      },
      500
    );
  }

  return c.json(
    {
      error: err.message || 'Internal server error',
      requestId: reqId,
      stack: err.stack,
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Start server
const port = env.PORT;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    const features = getFeatureFlags();

    logger.info(
      {
        port: info.port,
        environment: env.NODE_ENV,
        demoMode: isDemoModeAllowed(),
        features,
      },
      `Server started on http://localhost:${info.port}`
    );

    // Log feature availability
    if (!features.supabase) {
      logger.warn('Supabase not configured - running in demo mode');
    }
    if (!features.n8n) {
      logger.warn('N8N webhooks not configured - automation disabled');
    }
  }
);
