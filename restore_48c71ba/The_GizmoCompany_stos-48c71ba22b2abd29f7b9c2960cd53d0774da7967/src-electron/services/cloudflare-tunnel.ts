/**
 * Cloudflare Tunnel Manager
 * Manages secure tunneling of local services to Cloudflare Edge
 */

import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

export interface TunnelRoute {
  hostname: string;
  service: string;      // e.g., http://localhost:3000
  path?: string;
  tlsSkipVerify?: boolean;
}

export interface TunnelConfig {
  name: string;
  accountId: string;
  tunnelToken: string;
  routes: TunnelRoute[];
}

export interface TunnelStatus {
  hostname: string;
  service: string;
  status: 'active' | 'disconnected' | 'error';
  lastCheck: Date;
  uptime: number;       // seconds
  requestsPerMinute: number;
}

export class CloudflareTunnelManager {
  private config: TunnelConfig;
  private tunnelProcess: ChildProcess | null = null;
  private statuses: Map<string, TunnelStatus> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private cfApi: AxiosInstance;

  constructor(config: TunnelConfig) {
    this.config = config;
    this.cfApi = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    this.initializeStatuses();
  }

  private initializeStatuses() {
    for (const route of this.config.routes) {
      this.statuses.set(route.hostname, {
        hostname: route.hostname,
        service: route.service,
        status: 'disconnected',
        lastCheck: new Date(),
        uptime: 0,
        requestsPerMinute: 0,
      });
    }
  }

  /**
   * Start Cloudflare tunnel daemon
   */
  async start(): Promise<boolean> {
    try {
      console.log('🌐 Starting Cloudflare tunnel...');

      // Check if cloudflared is installed
      const cloudflaredPath = await this.findCloudflared();
      if (!cloudflaredPath) {
        console.error('❌ cloudflared not found. Install from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
        return false;
      }

      // Create tunnel configuration file
      await this.createTunnelConfig();

      // Start tunnel daemon
      this.tunnelProcess = spawn(cloudflaredPath, [
        'tunnel',
        'run',
        '--token',
        this.config.tunnelToken,
      ]);

      this.tunnelProcess.stdout?.on('data', (data) => {
        console.log(`[CF Tunnel] ${data.toString()}`);
      });

      this.tunnelProcess.stderr?.on('data', (data) => {
        console.error(`[CF Tunnel Error] ${data.toString()}`);
      });

      this.tunnelProcess.on('error', (error) => {
        console.error(`[CF Tunnel] Process error: ${error.message}`);
      });

      // Start health check
      this.startHealthChecks();

      console.log('✅ Cloudflare tunnel started');
      return true;
    } catch (error) {
      console.error(`❌ Failed to start tunnel: ${error}`);
      return false;
    }
  }

  /**
   * Stop tunnel daemon
   */
  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.tunnelProcess) {
      this.tunnelProcess.kill('SIGTERM');
      this.tunnelProcess = null;
      console.log('🛑 Cloudflare tunnel stopped');
    }
  }

  /**
   * Health check for all routes
   */
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      for (const route of this.config.routes) {
        await this.checkRouteHealth(route);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check health of a single route
   */
  private async checkRouteHealth(route: TunnelRoute) {
    try {
      const url = `https://${route.hostname}/health`;
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true, // Accept any status
      });

      const status = this.statuses.get(route.hostname);
      if (status) {
        status.status = response.status < 400 ? 'active' : 'error';
        status.lastCheck = new Date();
      }
    } catch (error) {
      const status = this.statuses.get(route.hostname);
      if (status) {
        status.status = 'disconnected';
        status.lastCheck = new Date();
      }
    }
  }

  /**
   * Create tunnel configuration file
   */
  private async createTunnelConfig(): Promise<void> {
    const configPath = path.join(process.env.HOME || '/root', '.cloudflared', 'config.yml');

    const config = `tunnel: ${this.config.name}
credentials-file: ${path.join(process.env.HOME || '/root', '.cloudflared', 'credentials.json')}

ingress:
${this.config.routes.map(route => `  - hostname: ${route.hostname}
    service: ${route.service}${route.path ? `\n    path: ${route.path}` : ''}`).join('\n')}
  - service: http_status:404
`;

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, config);

    console.log(`✅ Tunnel config created at ${configPath}`);
  }

  /**
   * Find cloudflared executable
   */
  private async findCloudflared(): Promise<string | null> {
    const paths = [
      '/usr/local/bin/cloudflared',
      '/usr/bin/cloudflared',
      '/opt/cloudflare/cloudflared',
      'cloudflared', // Try system PATH
    ];

    for (const p of paths) {
      try {
        if (fs.existsSync(p)) {
          return p;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Get tunnel status
   */
  getStatus(): TunnelStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Get status for specific hostname
   */
  getHostStatus(hostname: string): TunnelStatus | undefined {
    return this.statuses.get(hostname);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    const statuses = Array.from(this.statuses.values());
    const activeCount = statuses.filter(s => s.status === 'active').length;

    return {
      totalRoutes: statuses.length,
      activeRoutes: activeCount,
      failedRoutes: statuses.filter(s => s.status === 'error').length,
      disconnectedRoutes: statuses.filter(s => s.status === 'disconnected').length,
      uptime: statuses.reduce((sum, s) => sum + s.uptime, 0) / statuses.length,
      routes: statuses,
    };
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<boolean> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return this.start();
  }
}