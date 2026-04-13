const skipIfOffline = () => (global as any).__INTEGRATION_SKIP__ === true;
const BASE = 'http://localhost:5180';
const TEST_CONTENT = `integration-test-${Date.now()}`;
let savedRecordId: string;

describe('03 — BUCH D1: roundtrip zapis → query', () => {
    it('POST /api/d1/save zwraca record_id', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — BUCH (5180) niedostępny'); return; }
        const res = await fetch(`${BASE}/api/d1/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table: 'integration_tests',
                data: { content: TEST_CONTENT, source: 'test' },
                tags: ['test', 'integration'],
            }),
        });
        const body = await res.json() as { ok: boolean; record_id?: string };
        expect(body.ok).toBe(true);
        expect(body.record_id).toBeTruthy();
        savedRecordId = body.record_id!;
    });

    it('GET /api/d1/query zwraca zapisany rekord', async () => {
        if (skipIfOffline()) { console.warn('⏭️  Skipped — BUCH (5180) niedostępny'); return; }
        expect(savedRecordId).toBeTruthy();
        const res = await fetch(`${BASE}/api/d1/query?table=integration_tests&limit=50`);
        const body = await res.json() as { ok: boolean; data?: Array<{ id: string; content: string }> };
        expect(body.ok).toBe(true);
        expect(body.data).toBeInstanceOf(Array);
        const found = body.data!.find((r) => r.id === savedRecordId);
        expect(found).toBeDefined();
        expect(found!.content).toBe(TEST_CONTENT);
    });
});
