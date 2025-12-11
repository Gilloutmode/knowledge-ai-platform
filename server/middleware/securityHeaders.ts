import { Context, Next } from 'hono';

/**
 * Security Headers Middleware
 * Adds essential security headers to all responses
 * Based on OWASP recommendations
 */
export async function securityHeaders(c: Context, next: Next) {
  await next();

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter in browsers
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy - don't leak URLs
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - restrict browser features
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  // Content Security Policy - restrict resource loading
  // Permissive for API server, frontend should have stricter CSP
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.googleapis.com"
  );

  // Strict Transport Security - force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/**
 * Request ID Middleware
 * Adds unique request ID for tracing and logging
 */
export async function requestId(c: Context, next: Next) {
  const id = crypto.randomUUID();
  c.set('requestId', id);
  c.header('X-Request-ID', id);
  await next();
}

// Extend Hono context for request ID
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}
