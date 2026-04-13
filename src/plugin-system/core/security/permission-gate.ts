import { Capability } from './capability-types';

const permissionStore: Map<string, Set<Capability>> = new Map();

export class PermissionDeniedError extends Error {
    constructor(pluginId: string, capability: Capability) {
        super(`Permission denied for plugin "${pluginId}". Missing capability: ${capability}`);
        this.name = 'PermissionDeniedError';
    }
}

export function setCapabilities(pluginId: string, capabilities: Capability[]): void {
    permissionStore.set(pluginId, new Set(capabilities));
}

export function clearCapabilities(pluginId: string): void {
    permissionStore.delete(pluginId);
}

export function getCapabilities(pluginId: string): Capability[] {
    return Array.from(permissionStore.get(pluginId) ?? []);
}

export function hasCapability(pluginId: string, cap: Capability): boolean {
    const granted = permissionStore.get(pluginId);
    return granted?.has(cap) ?? false;
}

/**
 * Sprawdza czy plugin ma capability przed wywołaniem akcji
 */
export function checkCapability(pluginId: string, cap: Capability): void {
    if (!hasCapability(pluginId, cap)) {
        throw new PermissionDeniedError(pluginId, cap);
    }
}