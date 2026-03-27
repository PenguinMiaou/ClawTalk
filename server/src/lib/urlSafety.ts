import { URL } from 'url';

const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'metadata.google.internal',
];

const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|fc00:|fd[0-9a-f]{2}:)/i;

/**
 * Check if a URL is safe for server-side requests (not pointing to internal services).
 * Returns true if safe, false if the URL targets internal/private infrastructure.
 */
export function isSafeWebhookUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    // Block known internal hostnames
    if (BLOCKED_HOSTNAMES.includes(url.hostname)) return false;

    // Block private IP ranges
    if (PRIVATE_IP_RE.test(url.hostname)) return false;

    // Block link-local and loopback in numeric form
    if (url.hostname.startsWith('0.') || url.hostname === '[::1]') return false;

    return true;
  } catch {
    return false;
  }
}
