import { Context, Next } from "hono";
import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "../lib/logger";

/**
 * Webhook Authentication Middleware
 *
 * Security features:
 * 1. HMAC-SHA256 signature verification (preferred)
 * 2. Timestamp validation to prevent replay attacks
 * 3. Timing-safe comparison to prevent timing attacks
 *
 * Headers expected for HMAC mode:
 * - X-Webhook-Signature: HMAC-SHA256 signature of the payload
 * - X-Webhook-Timestamp: Unix timestamp (seconds) when the request was sent
 *
 * Legacy mode (deprecated):
 * - X-Webhook-Secret: Static secret comparison (will be removed in future)
 */

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

// Maximum age of a webhook request (5 minutes)
const MAX_TIMESTAMP_AGE_SECONDS = 300;

// Minimum secret length for security
const MIN_SECRET_LENGTH = 32;

/**
 * Generate HMAC-SHA256 signature for a payload
 * Used by N8N or other webhook senders to sign requests
 *
 * @example
 * const signature = generateWebhookSignature(JSON.stringify(payload), timestamp, secret);
 * // Send with headers:
 * // X-Webhook-Signature: sha256=<signature>
 * // X-Webhook-Timestamp: <timestamp>
 */
export function generateWebhookSignature(
  payload: string,
  timestamp: number,
  secret: string,
): string {
  const signaturePayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signaturePayload).digest("hex");
}

/**
 * Verify HMAC-SHA256 signature
 * Returns true if signature is valid, false otherwise
 */
function verifyHmacSignature(
  payload: string,
  timestamp: number,
  providedSignature: string,
  secret: string,
): boolean {
  const expectedSignature = generateWebhookSignature(
    payload,
    timestamp,
    secret,
  );

  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verify timestamp is within acceptable range
 * Prevents replay attacks by rejecting old requests
 */
function isTimestampValid(timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  return age <= MAX_TIMESTAMP_AGE_SECONDS;
}

export async function webhookAuth(c: Context, next: Next) {
  // Check if secret is configured
  if (!WEBHOOK_SECRET) {
    // In development, warn and allow (for testing only)
    if (process.env.NODE_ENV !== "production") {
      logger.warn(
        "N8N_WEBHOOK_SECRET not configured - webhook auth disabled (DEVELOPMENT ONLY)",
      );
      return next();
    }

    // In production, reject all requests if no secret configured
    logger.error(
      "Webhook rejected: N8N_WEBHOOK_SECRET not configured in production",
    );
    return c.json({ error: "Webhook authentication not configured" }, 500);
  }

  // Validate secret length
  if (WEBHOOK_SECRET.length < MIN_SECRET_LENGTH) {
    logger.warn(
      `Webhook secret is too short (${WEBHOOK_SECRET.length} chars). ` +
        `Minimum recommended: ${MIN_SECRET_LENGTH} chars. ` +
        `Generate with: openssl rand -hex 32`,
    );
  }

  // Get authentication headers
  const signature = c.req.header("X-Webhook-Signature");
  const timestampHeader = c.req.header("X-Webhook-Timestamp");
  const legacySecret =
    c.req.header("X-Webhook-Secret") ||
    c.req.header("Authorization")?.replace("Bearer ", "");

  // HMAC mode (preferred)
  if (signature && timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10);

    // Validate timestamp format
    if (isNaN(timestamp)) {
      logger.error("Webhook rejected: Invalid timestamp format");
      return c.json({ error: "Invalid timestamp format" }, 401);
    }

    // Check timestamp age (replay protection)
    if (!isTimestampValid(timestamp)) {
      logger.error(
        { timestamp, age: Math.abs(Math.floor(Date.now() / 1000) - timestamp) },
        "Webhook rejected: Timestamp too old (possible replay attack)",
      );
      return c.json(
        {
          error: "Request timestamp too old",
          maxAge: MAX_TIMESTAMP_AGE_SECONDS,
        },
        401,
      );
    }

    // Get raw body for signature verification
    let rawBody: string;
    try {
      rawBody = await c.req.text();
      // Re-parse the body since we consumed it
      // Hono will cache the parsed body
    } catch {
      logger.error("Webhook rejected: Failed to read request body");
      return c.json({ error: "Failed to read request body" }, 400);
    }

    // Extract signature (remove 'sha256=' prefix if present)
    const cleanSignature = signature.replace(/^sha256=/, "");

    // Verify signature
    if (
      !verifyHmacSignature(rawBody, timestamp, cleanSignature, WEBHOOK_SECRET)
    ) {
      logger.error("Webhook rejected: Invalid HMAC signature");
      return c.json({ error: "Invalid signature" }, 401);
    }

    logger.debug("Webhook authenticated via HMAC-SHA256");
    return next();
  }

  // Legacy mode (simple secret comparison)
  // DEPRECATED: Will be removed in future versions
  if (legacySecret) {
    logger.warn(
      "Using legacy webhook authentication (X-Webhook-Secret header). " +
        "Please migrate to HMAC-SHA256 signatures for better security.",
    );

    // Timing-safe comparison for legacy mode too
    try {
      const providedBuffer = Buffer.from(legacySecret);
      const expectedBuffer = Buffer.from(WEBHOOK_SECRET);

      if (
        providedBuffer.length === expectedBuffer.length &&
        timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        logger.debug("Webhook authenticated via legacy secret (DEPRECATED)");
        return next();
      }
    } catch {
      // Fall through to rejection
    }

    logger.error("Webhook rejected: Invalid legacy secret");
    return c.json({ error: "Invalid webhook secret" }, 401);
  }

  // No authentication provided
  logger.error("Webhook rejected: No authentication provided");
  return c.json(
    {
      error: "Unauthorized: Missing webhook authentication",
      hint: "Provide X-Webhook-Signature and X-Webhook-Timestamp headers for HMAC auth",
    },
    401,
  );
}

/**
 * Documentation for N8N webhook configuration:
 *
 * To configure HMAC signatures in N8N:
 *
 * 1. In your N8N workflow, before the HTTP Request node, add a Code node:
 *
 * ```javascript
 * const crypto = require('crypto');
 *
 * const secret = $env.N8N_WEBHOOK_SECRET;
 * const timestamp = Math.floor(Date.now() / 1000);
 * const payload = JSON.stringify($input.all());
 *
 * const signature = crypto
 *   .createHmac('sha256', secret)
 *   .update(`${timestamp}.${payload}`)
 *   .digest('hex');
 *
 * return {
 *   json: {
 *     ...$input.first().json,
 *     __signature: `sha256=${signature}`,
 *     __timestamp: timestamp.toString()
 *   }
 * };
 * ```
 *
 * 2. In the HTTP Request node, set headers:
 *    - X-Webhook-Signature: {{ $json.__signature }}
 *    - X-Webhook-Timestamp: {{ $json.__timestamp }}
 *
 * 3. Set the environment variable N8N_WEBHOOK_SECRET in both N8N and your server
 */
