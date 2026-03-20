/**
 * MCP Network Control Tools — connection status, port scanning, bandwidth, firewall
 */

import type { MCPTool } from '../mcp-server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as dns from 'dns';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';

const execFileAsync = promisify(execFile);
const dnsResolve = promisify(dns.resolve);

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function createNetworkTools(): MCPTool[] {
  return [
    {
      name: 'net_interfaces',
      description: 'List all network interfaces with IP addresses, MAC, status',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        const interfaces = os.networkInterfaces();
        const result: Record<string, unknown[]> = {};
        for (const [name, addrs] of Object.entries(interfaces)) {
          if (!addrs) continue;
          result[name] = addrs.map(a => ({
            address: a.address,
            netmask: a.netmask,
            family: a.family,
            mac: a.mac,
            internal: a.internal,
            cidr: a.cidr,
          }));
        }
        return { interfaces: result, hostname: os.hostname() };
      },
    },

    {
      name: 'net_connections',
      description: 'Show active network connections (netstat)',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter: all, listening, established', enum: ['all', 'listening', 'established'] },
        },
      },
      handler: async (input) => {
        const filter = str(input.filter) || 'all';
        const flagMap: Record<string, string[]> = {
          all: ['-an'],
          listening: ['-an'],
          established: ['-an'],
        };
        try {
          const { stdout } = await execFileAsync('netstat', flagMap[filter] || ['-an'], {
            timeout: 15_000,
            windowsHide: true,
          });

          let lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
          if (filter === 'listening') {
            lines = lines.filter(l => l.includes('LISTENING'));
          } else if (filter === 'established') {
            lines = lines.filter(l => l.includes('ESTABLISHED'));
          }

          return { filter, connections: lines.slice(0, 200), total: lines.length };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    },

    {
      name: 'net_port_check',
      description: 'Check if a specific port is open on a host',
      inputSchema: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Host to check' },
          port: { type: 'number', description: 'Port number' },
          timeout: { type: 'number', description: 'Timeout in ms (default: 3000)' },
        },
        required: ['host', 'port'],
      },
      handler: async (input) => {
        const host = str(input.host);
        const port = Number(input.port);
        const timeout = Math.min(Number(input.timeout) || 3000, 10000);

        if (!host || !port || port < 1 || port > 65535) {
          return { error: 'Invalid host or port' };
        }
        if (/[;&|`$(){}><\r\n]/.test(host)) {
          return { error: 'Invalid host characters' };
        }

        return new Promise((resolve) => {
          const socket = new net.Socket();
          const startTime = Date.now();

          socket.setTimeout(timeout);
          socket.on('connect', () => {
            const latency = Date.now() - startTime;
            socket.destroy();
            resolve({ host, port, open: true, latency });
          });
          socket.on('timeout', () => {
            socket.destroy();
            resolve({ host, port, open: false, reason: 'timeout' });
          });
          socket.on('error', (err: any) => {
            socket.destroy();
            resolve({ host, port, open: false, reason: err.code || err.message });
          });
          socket.connect(port, host);
        });
      },
    },

    {
      name: 'net_port_scan',
      description: 'Scan common ports on a host (limited to prevent abuse)',
      inputSchema: {
        type: 'object',
        properties: {
          host: { type: 'string', description: 'Host to scan' },
          ports: {
            type: 'string',
            description: 'Comma-separated ports or "common" for well-known ports (default: common)',
          },
        },
        required: ['host'],
      },
      handler: async (input) => {
        const host = str(input.host);
        if (!host || /[;&|`$(){}><\r\n]/.test(host)) {
          return { error: 'Invalid host' };
        }

        const COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 5900, 8080, 8443];
        let ports: number[];

        const portsStr = str(input.ports);
        if (!portsStr || portsStr === 'common') {
          ports = COMMON_PORTS;
        } else {
          ports = portsStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => p > 0 && p <= 65535);
        }

        // Limit to 30 ports to prevent abuse
        ports = ports.slice(0, 30);

        const results = await Promise.all(
          ports.map(port => new Promise<{ port: number; open: boolean; latency?: number }>((resolve) => {
            const socket = new net.Socket();
            const start = Date.now();
            socket.setTimeout(2000);
            socket.on('connect', () => { socket.destroy(); resolve({ port, open: true, latency: Date.now() - start }); });
            socket.on('timeout', () => { socket.destroy(); resolve({ port, open: false }); });
            socket.on('error', () => { socket.destroy(); resolve({ port, open: false }); });
            socket.connect(port, host);
          }))
        );

        const openPorts = results.filter(r => r.open);
        return { host, scanned: ports.length, open: openPorts, closed: results.filter(r => !r.open).length };
      },
    },

    {
      name: 'net_dns_resolve',
      description: 'Resolve DNS records for a domain',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Domain name' },
          type: { type: 'string', description: 'Record type', enum: ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SRV', 'SOA'] },
        },
        required: ['domain'],
      },
      handler: async (input) => {
        const domain = str(input.domain);
        if (!domain) return { error: 'domain required' };

        const type = (str(input.type) || 'A').toUpperCase();

        try {
          const records = await dnsResolve(domain, type as any);
          return { domain, type, records };
        } catch (error: any) {
          return { domain, type, error: error.message };
        }
      },
    },

    {
      name: 'net_http_check',
      description: 'Check HTTP(S) endpoint — status code, headers, latency',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check' },
          method: { type: 'string', description: 'HTTP method (default: GET)', enum: ['GET', 'HEAD', 'POST'] },
        },
        required: ['url'],
      },
      handler: async (input) => {
        const rawUrl = str(input.url);
        if (!rawUrl) return { error: 'url required' };

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(rawUrl);
        } catch {
          return { error: 'Invalid URL' };
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return { error: 'Only http/https URLs allowed' };
        }

        const method = str(input.method).toUpperCase() || 'GET';
        const lib = parsedUrl.protocol === 'https:' ? https : http;

        return new Promise((resolve) => {
          const startTime = Date.now();
          const req = lib.request(parsedUrl, { method, timeout: 10000 }, (res) => {
            const latency = Date.now() - startTime;
            let body = '';
            res.on('data', (chunk) => { if (body.length < 2048) body += chunk; });
            res.on('end', () => {
              resolve({
                url: rawUrl,
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers: res.headers,
                latency,
                bodyPreview: body.substring(0, 500),
              });
            });
          });
          req.on('timeout', () => { req.destroy(); resolve({ url: rawUrl, error: 'timeout' }); });
          req.on('error', (err) => { resolve({ url: rawUrl, error: err.message }); });
          req.end();
        });
      },
    },

    {
      name: 'net_speed_test',
      description: 'Quick bandwidth test — download speed estimation',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        // Download a small file from Cloudflare to estimate speed
        const testUrl = 'https://speed.cloudflare.com/__down?bytes=1000000'; // 1MB
        const startTime = Date.now();

        return new Promise((resolve) => {
          let bytes = 0;
          const req = https.get(testUrl, { timeout: 15000 }, (res) => {
            res.on('data', (chunk: Buffer) => { bytes += chunk.length; });
            res.on('end', () => {
              const elapsed = (Date.now() - startTime) / 1000;
              const mbps = ((bytes * 8) / elapsed / 1_000_000).toFixed(2);
              resolve({
                downloadedBytes: bytes,
                elapsedSeconds: elapsed.toFixed(2),
                speedMbps: mbps,
                note: 'Approximate — single-stream 1MB test',
              });
            });
          });
          req.on('timeout', () => { req.destroy(); resolve({ error: 'Speed test timed out' }); });
          req.on('error', (err) => { resolve({ error: err.message }); });
        });
      },
    },

    {
      name: 'net_wifi_info',
      description: 'Get WiFi connection details (SSID, signal, auth)',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const { stdout } = await execFileAsync('netsh', ['wlan', 'show', 'interfaces'], {
            timeout: 5000,
            windowsHide: true,
          });
          return { result: stdout.trim() };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    },

    {
      name: 'net_firewall_rules',
      description: 'List Windows Firewall rules (inbound or outbound)',
      inputSchema: {
        type: 'object',
        properties: {
          direction: { type: 'string', description: 'in or out', enum: ['in', 'out'] },
          name: { type: 'string', description: 'Filter by rule name (optional)' },
        },
      },
      handler: async (input) => {
        const dir = str(input.direction) || 'in';
        const nameFilter = str(input.name);

        const args = ['advfirewall', 'firewall', 'show', 'rule',
          `name=${nameFilter || 'all'}`, `dir=${dir}`];

        try {
          const { stdout } = await execFileAsync('netsh', args, {
            timeout: 10000,
            windowsHide: true,
          });
          // Truncate output to avoid huge responses
          const lines = stdout.split('\n').slice(0, 500);
          return { direction: dir, rules: lines.join('\n').trim(), truncated: stdout.split('\n').length > 500 };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    },

    {
      name: 'net_arp_table',
      description: 'Show ARP table (IP-to-MAC mappings on local network)',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const { stdout } = await execFileAsync('arp', ['-a'], {
            timeout: 5000,
            windowsHide: true,
          });
          return { result: stdout.trim() };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    },

    {
      name: 'net_route_table',
      description: 'Show IP routing table',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const { stdout } = await execFileAsync('route', ['print'], {
            timeout: 5000,
            windowsHide: true,
          });
          return { result: stdout.trim() };
        } catch (error: any) {
          return { error: error.message };
        }
      },
    },
  ];
}
