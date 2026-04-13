import { ALL_CAPABILITIES, Capability } from './capability-types';

const NAME_REGEX = /^[a-zA-Z0-9-_]{3,64}$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    permissions: Capability[];
    entryPoint: string;
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isCapability(value: string): value is Capability {
    return (ALL_CAPABILITIES as readonly string[]).includes(value);
}

export function validateManifest(manifest: unknown): asserts manifest is PluginManifest {
    if (!isRecord(manifest)) {
        throw new ValidationError('Manifest must be an object');
    }

    const { id, name, version, permissions, entryPoint } = manifest;

    if (!id || typeof id !== 'string') {
        throw new ValidationError('Missing required field: id');
    }

    if (typeof name !== 'string' || !NAME_REGEX.test(name)) {
        throw new ValidationError(
            'Manifest.name must be 3-64 chars and contain only [a-zA-Z0-9-_]'
        );
    }

    if (typeof version !== 'string' || !SEMVER_REGEX.test(version)) {
        throw new ValidationError('Manifest.version must be in semver format x.y.z');
    }

    if (!Array.isArray(permissions)) {
        throw new ValidationError('Manifest.permissions must be an array');
    }

    for (const permission of permissions) {
        if (typeof permission !== 'string' || !isCapability(permission)) {
            throw new ValidationError(`Unknown capability in manifest.permissions: ${String(permission)}`);
        }
    }

    if (typeof entryPoint !== 'string') {
        throw new ValidationError('Manifest.entryPoint must be a string');
    }

    if (entryPoint.includes('../') || entryPoint.includes('..\\')) {
        throw new ValidationError('Manifest.entryPoint contains forbidden path traversal (../)');
    }

    if (!entryPoint.endsWith('.js') && !entryPoint.endsWith('.mjs')) {
        throw new ValidationError('Manifest.entryPoint must end with .js or .mjs');
    }
}