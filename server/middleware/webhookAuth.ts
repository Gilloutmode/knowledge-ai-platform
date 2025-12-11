import { Context, Next } from 'hono';
import { logger } from '../lib/logger';

/**
 * Webhook Authentication Middleware
 * Verifies that incoming webhook requests contain a valid secret token
 * This protects against unauthorized data injection from external sources
 */

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

export async function webhookAuth(c: Context, next: Next) {
  // Skip auth in development if no secret is configured
  if (!WEBHOOK_SECRET) {
    logger.warn('N8N_WEBHOOK_SECRET not configured - webhook auth disabled');
    return next();
  }

  // Check for secret in multiple locations (header, query, body)
  const headerSecret =
    c.req.header('X-Webhook-Secret') || c.req.header('Authorization')?.replace('Bearer ', '');
  const querySecret = c.req.query('secret');

  const providedSecret = headerSecret || querySecret;

  if (!providedSecret) {
    logger.error('Webhook request rejected: No secret provided');
    return c.json({ error: 'Unauthorized: Missing webhook secret' }, 401);
  }

  if (providedSecret !== WEBHOOK_SECRET) {
    logger.error('Webhook request rejected: Invalid secret');
    return c.json({ error: 'Unauthorized: Invalid webhook secret' }, 401);
  }

  // Secret is valid, proceed
  logger.debug('Webhook authenticated successfully');
  return next();
}
