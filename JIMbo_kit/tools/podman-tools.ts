import { execSync } from 'child_process';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

type PodmanContainer = {
    Names?: string | string[];
    State?: string;
    Status?: string;
    Image?: string;
    ID?: string;
};

function runPodman(command: string): string {
    return execSync(command, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
}

const podmanListContainers: ToolHandler = async (): Promise<ToolResult<PodmanContainer[]>> => {
    try {
        const output = runPodman('podman ps --format json');
        const data = JSON.parse(output) as PodmanContainer[];
        return { ok: true, data };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const podmanContainerStatus: ToolHandler = async (args): Promise<ToolResult<PodmanContainer | null>> => {
    try {
        const name = typeof args.name === 'string' ? args.name : '';
        if (!name) {
            return { ok: false, error: 'name is required' };
        }

        const output = runPodman('podman ps -a --format json');
        const data = JSON.parse(output) as PodmanContainer[];
        const found = data.find((c) => {
            const names = Array.isArray(c.Names) ? c.Names : [c.Names ?? ''];
            return names.includes(name);
        });
        return { ok: true, data: found ?? null };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const podmanStartContainer: ToolHandler = async (args): Promise<ToolResult<{ output: string }>> => {
    try {
        const name = typeof args.name === 'string' ? args.name : '';
        if (!name) {
            return { ok: false, error: 'name is required' };
        }
        const output = runPodman(`podman start ${JSON.stringify(name)}`);
        return { ok: true, data: { output: output.trim() } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const podmanStopContainer: ToolHandler = async (args): Promise<ToolResult<{ output: string }>> => {
    try {
        const name = typeof args.name === 'string' ? args.name : '';
        if (!name) {
            return { ok: false, error: 'name is required' };
        }
        const output = runPodman(`podman stop ${JSON.stringify(name)}`);
        return { ok: true, data: { output: output.trim() } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const podmanToolDefinitions: ToolDefinition[] = [
    {
        name: 'podman_list_containers',
        description: 'List running Podman containers',
        parameters: {},
    },
    {
        name: 'podman_container_status',
        description: 'Get status of a specific Podman container',
        parameters: {
            name: { type: 'string', description: 'Container name', required: true },
        },
    },
    {
        name: 'podman_start_container',
        description: 'Start Podman container by name',
        parameters: {
            name: { type: 'string', description: 'Container name', required: true },
        },
    },
    {
        name: 'podman_stop_container',
        description: 'Stop Podman container by name',
        parameters: {
            name: { type: 'string', description: 'Container name', required: true },
        },
    },
];

export const podmanToolHandlers: Record<string, ToolHandler> = {
    podman_list_containers: podmanListContainers,
    podman_container_status: podmanContainerStatus,
    podman_start_container: podmanStartContainer,
    podman_stop_container: podmanStopContainer,
};