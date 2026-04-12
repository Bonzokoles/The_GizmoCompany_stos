import dns from 'dns/promises';
import net from 'net';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';

const netHttpGet: ToolHandler = async (args): Promise<ToolResult<{ status: number; url: string; body: string }>> => {
    try {
        const inputUrl = typeof args.url === 'string' ? args.url : '';
        if (!inputUrl) {
            return { ok: false, error: 'url is required' };
        }

        let currentUrl = inputUrl;
        let redirects = 0;

        while (redirects <= 5) {
            const response = await fetch(currentUrl, {
                method: 'GET',
                redirect: 'manual',
                signal: AbortSignal.timeout(12_000),
            });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location) break;
                currentUrl = new URL(location, currentUrl).toString();
                redirects += 1;
                continue;
            }

            const body = await response.text();
            return { ok: true, data: { status: response.status, url: currentUrl, body } };
        }

        return { ok: false, error: 'Too many redirects (max 5)' };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const netPortCheck: ToolHandler = async (args): Promise<ToolResult<{ reachable: boolean }>> => {
    try {
        const host = typeof args.host === 'string' ? args.host : '';
        const portRaw = typeof args.port === 'number' ? args.port : Number(args.port);
        const port = Number.isFinite(portRaw) ? Math.floor(portRaw) : NaN;

        if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
            return { ok: false, error: 'host and valid port are required' };
        }

        const reachable = await new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            const timeoutMs = 3000;

            const finalize = (value: boolean) => {
                socket.destroy();
                resolve(value);
            };

            socket.setTimeout(timeoutMs);
            socket.once('connect', () => finalize(true));
            socket.once('timeout', () => finalize(false));
            socket.once('error', () => finalize(false));
            socket.connect(port, host);
        });

        return { ok: true, data: { reachable } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

const netDnsResolve: ToolHandler = async (args): Promise<ToolResult<{ records: string[] }>> => {
    try {
        const hostname = typeof args.hostname === 'string' ? args.hostname : '';
        if (!hostname) {
            return { ok: false, error: 'hostname is required' };
        }
        const records = await dns.resolve4(hostname);
        return { ok: true, data: { records } };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
};

export const networkToolDefinitions: ToolDefinition[] = [
    {
        name: 'net_http_get',
        description: 'HTTP GET request with redirect limit (max 5)',
        parameters: {
            url: { type: 'string', description: 'URL to fetch', required: true },
        },
    },
    {
        name: 'net_port_check',
        description: 'Check TCP reachability for host:port',
        parameters: {
            host: { type: 'string', description: 'Target host', required: true },
            port: { type: 'number', description: 'Target TCP port', required: true },
        },
    },
    {
        name: 'net_dns_resolve',
        description: 'Resolve DNS A records for hostname',
        parameters: {
            hostname: { type: 'string', description: 'Hostname to resolve', required: true },
        },
    },
];

export const networkToolHandlers: Record<string, ToolHandler> = {
    net_http_get: netHttpGet,
    net_port_check: netPortCheck,
    net_dns_resolve: netDnsResolve,
};