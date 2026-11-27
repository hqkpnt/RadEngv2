// Security utilities: Strict XSS input normalization, URL allowlisting & Clickjacking detection

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strips non-printable control characters while preserving plain text characters.
 * React JSX automatically escapes HTML entities on render; this also protects
 * stored JSON/localStorage payloads from malformed control sequences.
 */
export function sanitizePlainText(input: unknown, maxLength = 20000): string {
  if (typeof input !== 'string') {
    if (typeof input === 'number') return String(input);
    return '';
  }
  return input.replace(CONTROL_CHARS_RE, '').slice(0, maxLength);
}

/**
 * Strict HTTPS validation for Google Apps Script Web App sync URLs.
 * Rejects javascript:, data:, http:, and malformed URLs.
 */
export function sanitizeSyncUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim().replace(CONTROL_CHARS_RE, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Runtime Anti-Clickjacking check (works even on static hosts like GitHub Pages).
 */
export function isFramedByAnotherPage(): boolean {
  try {
    const w = window as unknown as { __CLICKJACKING_BLOCKED__?: boolean };
    if (w.__CLICKJACKING_BLOCKED__) return true;
    return window.self !== window.top;
  } catch {
    return true;
  }
}
