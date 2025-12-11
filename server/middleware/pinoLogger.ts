/**
 * Pino Logger Middleware for Hono
 * Structured request/response logging with timing
 */

import { createMiddleware } from 'hono/factory';
import { logger, createRequestLogger } from '../lib/logger';

/**
 * Pino logger middleware - logs all requests with structured data
 */
export const pinoLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  const requestId = c.get('requestId') || 'unknown';
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('user-agent') || 'unknown';

  // Create request-scoped logger
  const reqLogger = createRequestLogger(requestId, method, path);

  // Store logger in context for use in routes
  c.set('logger', reqLogger);

  // Log incoming request
  reqLogger.info({
    type: 'request',
    userAgent,
    query: c.req.query(),
  });

  try {
    await next();
  } catch (error) {
    // Log error with full context
    reqLogger.error({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  // Calculate response time
  const responseTime = Date.now() - start;
  const status = c.res.status;

  // Log response
  const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

  reqLogger[logLevel]({
    type: 'response',
    status,
    responseTime,
    contentLength: c.res.headers.get('content-length'),
  });
});

/**
 * Logging utility functions for use in routes
 */
export const logInfo = (
  c: { get: (key: string) => unknown },
  message: string,
  data?: Record<string, unknown>
) => {
  const reqLogger = c.get('logger') as typeof logger | undefined;
  if (reqLogger) {
    reqLogger.info(data, message);
  } else {
    logger.info(data, message);
  }
};

export const logWarn = (
  c: { get: (key: string) => unknown },
  message: string,
  data?: Record<string, unknown>
) => {
  const reqLogger = c.get('logger') as typeof logger | undefined;
  if (reqLogger) {
    reqLogger.warn(data, message);
  } else {
    logger.warn(data, message);
  }
};

export const logError = (
  c: { get: (key: string) => unknown },
  message: string,
  data?: Record<string, unknown>
) => {
  const reqLogger = c.get('logger') as typeof logger | undefined;
  if (reqLogger) {
    reqLogger.error(data, message);
  } else {
    logger.error(data, message);
  }
};

export default pinoLogger;
