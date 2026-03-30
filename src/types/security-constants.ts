/**
 * Security constants shared between main and renderer processes
 * Used for URL validation (CR-006 fix)
 */

export const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
] as const;

export type BlockedProtocol = typeof BLOCKED_PROTOCOLS[number];
