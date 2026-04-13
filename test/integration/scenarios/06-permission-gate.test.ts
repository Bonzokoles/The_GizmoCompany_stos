import {
    setCapabilities,
    clearCapabilities,
    hasCapability,
    checkCapability,
    PermissionDeniedError,
} from '../../../src/plugin-system/core/security/permission-gate';

describe('06 — Permission Gate: blokowanie nieautoryzowanego dostępu', () => {
    afterEach(() => {
        // Cleanup module-level store between tests
        clearCapabilities('test-plugin');
        clearCapabilities('terminal-plugin');
        clearCapabilities('temp-plugin');
    });

    it('plugin bez "system:terminal" → checkCapability() rzuca PermissionDeniedError', () => {
        setCapabilities('test-plugin', ['browser:navigation', 'ai:chat']);
        expect(() => checkCapability('test-plugin', 'system:terminal')).toThrow(PermissionDeniedError);
    });

    it('plugin z "system:terminal" → hasCapability() zwraca true', () => {
        setCapabilities('terminal-plugin', ['system:terminal', 'browser:navigation']);
        expect(hasCapability('terminal-plugin', 'system:terminal')).toBe(true);
    });

    it('niezarejestrowany plugin → hasCapability() zwraca false, nie rzuca wyjątku', () => {
        const result = hasCapability('nonexistent-plugin-xyz', 'browser:navigation');
        expect(result).toBe(false);
    });

    it('clearCapabilities usuwa plugin i jego uprawnienia', () => {
        setCapabilities('temp-plugin', ['catalog:read']);
        clearCapabilities('temp-plugin');
        expect(hasCapability('temp-plugin', 'catalog:read')).toBe(false);
    });
});
