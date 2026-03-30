/**
 * URL validation utilities for main process
 * Shared security layer for all navigation requests
 * Part of CR-006 fix (XSS/injection prevention)
 */

import { BLOCKED_PROTOCOLS } from '../../src/types/security-constants';

/**
 * Check if URL has safe protocol (no javascript:, data:, etc.)
 * @param url - URL string to validate
 * @returns true if URL protocol is safe, false otherwise
 */
export function isSafeUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return !BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p));
}

/**
 * Full URL sanitization with protocol validation and URL constructor check
 * @param raw - Raw URL input from user
 * @returns Sanitized URL string or null if invalid
 */
export function sanitizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Block dangerous protocols
  const lower = trimmed.toLowerCase();
  if (BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p))) {
    console.warn(`❌ Blocked unsafe protocol in URL: ${trimmed}`);
    return null;
  }

  // Add https:// if missing protocol
  let finalUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    finalUrl = `https://${trimmed}`;
  }

  // Validate URL format with URL constructor
  try {
    new URL(finalUrl);
    return finalUrl;
  } catch (e) {
    console.warn(`❌ Invalid URL format: ${finalUrl}`);
    return null;
  }
}

/**
 * Validate string input (type guard + length check)
 * @param val - Unknown value to validate
 * @returns true if valid non-empty string under 8KB
 */
export function isValidString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0 && val.length < 8192;
}
