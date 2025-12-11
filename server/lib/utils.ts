/**
 * Server Utility Functions
 */

/**
 * Escape special characters for PostgreSQL ILIKE queries
 * This prevents SQL injection through pattern matching wildcards
 */
export function escapeIlikePattern(input: string): string {
  if (!input) return '';

  // Escape PostgreSQL LIKE/ILIKE special characters
  // % matches any sequence of zero or more characters
  // _ matches any single character
  // \ is the escape character
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%') // Escape percent signs
    .replace(/_/g, '\\_'); // Escape underscores
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string input (remove control characters, trim)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}
