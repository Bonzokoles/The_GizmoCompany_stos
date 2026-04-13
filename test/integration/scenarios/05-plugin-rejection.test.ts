import { validateManifest, ValidationError } from '../../../src/plugin-system/core/security/manifest-validator';
import { ALL_CAPABILITIES } from '../../../src/plugin-system/core/security/capability-types';

// Minimal valid manifest — used as baseline
const VALID_MANIFEST = {
    id: 'test-plugin',
    name: 'TestPlugin',
    version: '1.0.0',
    permissions: [ALL_CAPABILITIES[0]],
    entryPoint: 'index.js',
};

describe('05 — Plugin Security: walidacja manifestu', () => {
    it('manifest bez pola id → rzuca ValidationError zawierający "id"', () => {
        const { id: _omit, ...noId } = VALID_MANIFEST;
        expect(() => validateManifest(noId)).toThrow(ValidationError);
        expect(() => validateManifest(noId)).toThrow(/id/i);
    });

    it('manifest z nieznaną capability → rzuca ValidationError zawierający "capability"', () => {
        expect(() =>
            validateManifest({
                ...VALID_MANIFEST,
                permissions: ['unknown:capability:xyz'],
            }),
        ).toThrow(ValidationError);
        expect(() =>
            validateManifest({
                ...VALID_MANIFEST,
                permissions: ['unknown:capability:xyz'],
            }),
        ).toThrow(/capability/i);
    });

    it('manifest bez entryPoint → rzuca ValidationError', () => {
        const { entryPoint: _omit, ...noEntry } = VALID_MANIFEST;
        expect(() => validateManifest(noEntry)).toThrow(ValidationError);
    });

    it('poprawny manifest → nie rzuca wyjątku', () => {
        expect(() => validateManifest(VALID_MANIFEST)).not.toThrow();
    });
});
