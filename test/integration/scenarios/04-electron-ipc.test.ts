import { IPC, BrowserNavigateRequest } from '../../../src/shared/ipc';

describe('04 — Electron IPC: typy kontraktów', () => {
    it('BrowserNavigateRequest jest zgodne z typami', () => {
        const request: BrowserNavigateRequest = {
            url: 'https://example.com',
            tabId: 'tab-1',
        };
        expect(request.url).toBeTruthy();
    });

    it('IPC.BROWSER.NAVIGATE jest stałym stringiem', () => {
        expect(typeof IPC.BROWSER.NAVIGATE).toBe('string');
        expect(IPC.BROWSER.NAVIGATE).toBe('browser:navigate');
    });

    it('Brak duplikatów nazw kanałów IPC', () => {
        const allChannels: string[] = [];
        Object.values(IPC).forEach((domain) => {
            Object.values(domain as Record<string, string>).forEach((ch) => {
                expect(allChannels).not.toContain(ch);
                allChannels.push(ch);
            });
        });
        expect(allChannels.length).toBeGreaterThan(0);
    });
});
