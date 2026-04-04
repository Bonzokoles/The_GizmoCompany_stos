/**
 * PodmanBridge — kontrola kontenerów Podman przez CLI
 *
 * Zapewnia: list, start, stop, restart, logs per kontener
 * Mapuje kontenery → namespace (domena skills)
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { CONTAINER_NAMESPACE } from '../skills/skill-manager.js';

const execAsync = promisify(exec);

export interface ContainerInfo {
  id:        string;
  name:      string;
  image:     string;
  status:    string;
  state:     'running' | 'stopped' | 'paused' | 'error' | 'unknown';
  ports:     string;
  namespace: string;   // domena skills przypisana do kontenera
}

export class PodmanBridge {

  isAvailable(): boolean {
    try {
      execSync('podman --version', { stdio: 'pipe' });
      return true;
    } catch { return false; }
  }

  /** Lista wszystkich kontenerów (running + stopped) */
  async list(): Promise<ContainerInfo[]> {
    try {
      const { stdout } = await execAsync(
        'podman ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}"',
        { timeout: 8000 },
      );
      return stdout.trim().split('\n').filter(Boolean).map(line => {
        const [id, name, image, status, state, ports] = line.split('|');
        return {
          id:        id?.trim()     ?? '',
          name:      name?.trim()   ?? '',
          image:     image?.trim()  ?? '',
          status:    status?.trim() ?? '',
          state:     this.parseState(state?.trim() ?? ''),
          ports:     ports?.trim()  ?? '',
          namespace: CONTAINER_NAMESPACE[name?.trim() ?? ''] ?? 'global',
        };
      });
    } catch { return []; }
  }

  /** Tylko uruchomione kontenery */
  async listRunning(): Promise<ContainerInfo[]> {
    const all = await this.list();
    return all.filter(c => c.state === 'running');
  }

  async start(name: string): Promise<{ ok: boolean; msg: string }> {
    try {
      await execAsync(`podman start ${name}`, { timeout: 15000 });
      return { ok: true, msg: `Kontener ${name} uruchomiony` };
    } catch (e) {
      return { ok: false, msg: e instanceof Error ? e.message : String(e) };
    }
  }

  async stop(name: string): Promise<{ ok: boolean; msg: string }> {
    try {
      await execAsync(`podman stop ${name}`, { timeout: 20000 });
      return { ok: true, msg: `Kontener ${name} zatrzymany` };
    } catch (e) {
      return { ok: false, msg: e instanceof Error ? e.message : String(e) };
    }
  }

  async restart(name: string): Promise<{ ok: boolean; msg: string }> {
    try {
      await execAsync(`podman restart ${name}`, { timeout: 30000 });
      return { ok: true, msg: `Kontener ${name} zrestartowany` };
    } catch (e) {
      return { ok: false, msg: e instanceof Error ? e.message : String(e) };
    }
  }

  async logs(name: string, lines = 80): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(
        `podman logs --tail ${lines} ${name}`,
        { timeout: 10000 },
      );
      return (stdout + stderr).trim() || '(brak logów)';
    } catch (e) {
      return `Błąd: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  async inspect(name: string): Promise<object | null> {
    try {
      const { stdout } = await execAsync(`podman inspect ${name}`, { timeout: 5000 });
      return JSON.parse(stdout)[0] ?? null;
    } catch { return null; }
  }

  private parseState(s: string): ContainerInfo['state'] {
    const l = s.toLowerCase();
    if (l === 'running')            return 'running';
    if (l === 'stopped' || l === 'exited') return 'stopped';
    if (l === 'paused')             return 'paused';
    if (l.includes('error'))        return 'error';
    return 'unknown';
  }
}
