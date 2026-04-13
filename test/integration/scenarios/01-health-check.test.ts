import { assertServiceUp } from '../helpers/service-checker';

const skipIfOffline = () => (global as any).__INTEGRATION_SKIP__ === true;

describe('01 — Health Check: Wszystkie serwisy', () => {
    it('JIMbo_kit (3701) odpowiada na /health', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — JIMbo_kit (3701) niedostępny'); return; }
        await assertServiceUp(3701, 'JIMbo_kit');
        const res = await fetch('http://localhost:3701/health');
        expect(res.ok).toBe(true);
        const body = await res.json() as { status?: string };
        expect(body.status).toBe('ok');
    }, 5000);

    it('JIMBO_agent_HUB (4224) odpowiada na /health', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — JIMBO_agent_HUB (4224) niedostępny'); return; }
        await assertServiceUp(4224, 'JIMBO_agent_HUB');
        const res = await fetch('http://localhost:4224/health');
        expect(res.ok).toBe(true);
    }, 5000);

    it('BUCH (5180) odpowiada na /health', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — BUCH (5180) niedostępny'); return; }
        await assertServiceUp(5180, 'BUCH');
        const res = await fetch('http://localhost:5180/health');
        expect(res.ok).toBe(true);
        const body = await res.json() as { status?: string };
        expect(body.status).toBe('ok');
    }, 5000);
});
