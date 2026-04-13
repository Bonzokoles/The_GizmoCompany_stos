import { requireServices } from './helpers/service-checker';

declare global {
    var __INTEGRATION_SKIP__: boolean | undefined;
}

beforeAll(async () => {
    try {
        await requireServices([3701, 4224, 5180]);
        global.__INTEGRATION_SKIP__ = false;
    } catch (err) {
        console.warn('[integration-setup] Skipping network parts — services not available:', (err as Error).message);
        global.__INTEGRATION_SKIP__ = true;
    }
}, 15000);