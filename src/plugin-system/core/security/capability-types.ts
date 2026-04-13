// cze lokalne pliki niecomitowane
/** Pełna lista dozwolonych capabilities — NIGDY nie rozszerzaj bez code review */
export const ALL_CAPABILITIES = [
    'browser:navigation',
    'browser:tabs',
    'ai:chat',
    'ai:completions',
    'network:fetch',
    'system:file-dialog',
    'system:terminal',
    'catalog:read',
    'catalog:write',
    'hub:query',
] as const;

export type Capability = typeof ALL_CAPABILITIES[number];