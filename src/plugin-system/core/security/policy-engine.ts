import { Capability } from './capability-types';
import { clearCapabilities, getCapabilities, hasCapability, setCapabilities } from './permission-gate';

/**
 * Centralna polityka — co może plugin runtime
 */
export class PolicyEngine {
    grantCapabilities(pluginId: string, caps: Capability[]): void {
        setCapabilities(pluginId, caps);
    }

    revokeAll(pluginId: string): void {
        clearCapabilities(pluginId);
    }

    isAllowed(pluginId: string, cap: Capability): boolean {
        return hasCapability(pluginId, cap);
    }

    getGranted(pluginId: string): Capability[] {
        return getCapabilities(pluginId);
    }

    // Default policies — system:terminal requires confirmation before granting
    applyDefaults(): void {
        // system:terminal is high-risk — block by default until explicitly opened by policy
        // Consumers check isAllowed() before executing terminal-related capabilities
        this.set('system:terminal', 'prompt');
    }

    private policies = new Map<string, 'allow' | 'deny' | 'prompt'>();

    set(capability: string, action: 'allow' | 'deny' | 'prompt'): void {
        this.policies.set(capability, action);
    }

    get(capability: string): 'allow' | 'deny' | 'prompt' {
        return this.policies.get(capability) ?? 'allow';
    }
}