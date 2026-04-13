const skipIfOffline = () => (global as any).__INTEGRATION_SKIP__ === true;
const BASE = 'http://localhost:3701';

describe('02 — JIMbo_kit: wywołanie narzędzia file_read', () => {
    it('file_read zwraca zawartość istniejącego pliku', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — JIMbo_kit (3701) niedostępny'); return; }
        const res = await fetch(`${BASE}/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'file_read', params: { path: 'package.json' } }),
        });
        const body = await res.json() as { ok: boolean; data?: { content?: string }; error?: string };
        expect(body.ok).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data!.content).toContain('"name"');
    });

    it('file_read zwraca {ok:false} dla nieistniejącego pliku', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — JIMbo_kit (3701) niedostępny'); return; }
        const res = await fetch(`${BASE}/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'file_read', params: { path: '/tmp/nonexistent-xyz-12345.txt' } }),
        });
        const body = await res.json() as { ok: boolean; error?: string };
        expect(body.ok).toBe(false);
        expect(body.error).toBeTruthy();
    });

    it('env_get NIGDY nie zwraca kluczy z SECRET/TOKEN/PASSWORD', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — JIMbo_kit (3701) niedostępny'); return; }
        const res = await fetch(`${BASE}/tool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'env_get', params: { key: 'CF_API_TOKEN' } }),
        });
        const body = await res.json() as { ok: boolean; error?: string };
        expect(body.ok).toBe(false);
        expect(body.error).toContain('not allowed');
    });
});
