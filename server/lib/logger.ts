/**
 * Structured Logger with Pino
 * Production-ready logging with JSON output for log aggregation
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Production: JSON format for log aggregation (ELK, CloudWatch, etc.)
// Development: Pretty format for readability
const transport = isProduction
  ? undefined // Use default JSON output
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    };

export const logger = pino({
  level: logLevel,
  transport,
  base: {
    service: 'youtube-learning-platform',
    version: process.env.npm_package_version || '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Redact sensitive data
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'apiKey'],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

/**
 * Request logger - creates a logger with request context
 */
export function createRequestLogger(requestId: string, method: string, path: string) {
  return logger.child({
    requestId,
    method,
    path,
  });
}

/**
 * Log levels:
 * - fatal: System is unusable
 * - error: Error conditions
 * - warn: Warning conditions
 * - info: Informational messages
 * - debug: Debug-level messages
 * - trace: Trace-level messages
 */

export type Logger = pino.Logger;
export default logger;
