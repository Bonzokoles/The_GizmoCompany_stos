/**
 * cf-remote.ts — Cloudflare REST API + GitHub Actions bridge
 *
 * Wymagane w .env:
 *   CF_API_TOKEN=...       ← https://dash.cloudflare.com/profile/api-tokens (Pages:Edit + D1:Read)
 *   CF_ACCOUNT_ID=...      ← https://dash.cloudflare.com/ → prawy panel
 *   GITHUB_TOKEN=...       ← https://github.com/settings/tokens (workflow scope)
 *
 * CF Pages API docs: https://developers.cloudflare.com/api/resources/pages/
 * CF D1 API docs:    https://developers.cloudflare.com/api/resources/d1/
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4';
const TIMEOUT_MS = 10_000;

function cfHeaders(): HeadersInit {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error('CF_API_TOKEN nie ustawiony w .env');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function accountId(): string {
  const id = process.env.CF_ACCOUNT_ID;
  if (!id) throw new Error('CF_ACCOUNT_ID nie ustawiony w .env');
  return id;
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${CF_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...cfHeaders(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json() as { success: boolean; result: T; errors?: { message: string }[] };
  if (!json.success) {
    const msg = json.errors?.map(e => e.message).join('; ') ?? `CF API error ${res.status}`;
    throw new Error(msg);
  }
  return json.result;
}

// ── Typy ─────────────────────────────────────────────────────────────

export interface CFDeployment {
  id: string;
  created_on: string;
  modified_on: string;
  environment: 'production' | 'preview';
  url: string;
  latest_stage: { name: string; status: 'success' | 'failure' | 'active' | 'idle'; ended_on?: string };
  deployment_trigger: { type: string; metadata?: { branch?: string; commit_message?: string; commit_hash?: string } };
  short_id: string;
}

export interface CFProject {
  name: string;
  subdomain: string;
  domains: string[];
  created_on: string;
  latest_deployment?: CFDeployment;
}

export interface D1Stats {
  uuid: string;
  name: string;
  num_tables: number;
  file_size: number;
  created_at: string;
}

// ── CF Pages ─────────────────────────────────────────────────────────

/** Lista wszystkich CF Pages projektów na koncie */
export async function listCFProjects(): Promise<CFProject[]> {
  return cfFetch<CFProject[]>(`/accounts/${accountId()}/pages/projects`);
}

/** Szczegóły jednego projektu (+ latest deployment) */
export async function getCFProject(projectName: string): Promise<CFProject> {
  return cfFetch<CFProject>(`/accounts/${accountId()}/pages/projects/${projectName}`);
}

/** Historia deploymentów (najnowsze pierwsze) */
export async function listDeployments(projectName: string, limit = 5): Promise<CFDeployment[]> {
  const all = await cfFetch<CFDeployment[]>(
    `/accounts/${accountId()}/pages/projects/${projectName}/deployments`
  );
  return all.slice(0, limit);
}

/** Trigger nowego deploymentu (production) */
export async function triggerDeploy(projectName: string): Promise<CFDeployment> {
  return cfFetch<CFDeployment>(
    `/accounts/${accountId()}/pages/projects/${projectName}/deployments`,
    { method: 'POST' }
  );
}

/** Logi konkretnego deploymentu */
export async function getDeploymentLogs(projectName: string, deploymentId: string): Promise<string> {
  interface LogResult { data: { ts: string; line: string }[] }
  const result = await cfFetch<LogResult>(
    `/accounts/${accountId()}/pages/projects/${projectName}/deployments/${deploymentId}/history/logs`
  );
  return result.data.map(l => `[${l.ts}] ${l.line}`).join('\n');
}

/** Logi ostatniego deploymentu */
export async function getLatestDeploymentLogs(projectName: string): Promise<{ deploymentId: string; logs: string; status: string }> {
  const deployments = await listDeployments(projectName, 1);
  if (!deployments.length) throw new Error(`Brak deploymentów dla ${projectName}`);
  const d = deployments[0];
  const logs = await getDeploymentLogs(projectName, d.id);
  return { deploymentId: d.id, logs, status: d.latest_stage.status };
}

// ── CF D1 ────────────────────────────────────────────────────────────

/** Statystyki bazy D1 po database_id */
export async function getD1Stats(databaseId: string): Promise<D1Stats> {
  return cfFetch<D1Stats>(`/accounts/${accountId()}/d1/database/${databaseId}`);
}

/** Query do D1 przez REST API */
export async function d1Query(
  databaseId: string,
  sql: string,
  params: (string | number | null)[] = []
): Promise<{ results: Record<string, unknown>[]; meta: { duration: number; rows_read: number } }> {
  interface D1Result { results: Record<string, unknown>[]; meta: { duration: number; rows_read: number } }
  const result = await cfFetch<D1Result[]>(
    `/accounts/${accountId()}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    }
  );
  return result[0];
}

// ── GitHub Actions ────────────────────────────────────────────────────

const GH_API = 'https://api.github.com';

function ghHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN nie ustawiony w .env');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/** Trigger workflow_dispatch na branch main */
export async function triggerGHWorkflow(
  owner: string,
  repo: string,
  workflow: string,
  inputs: Record<string, string> = {}
): Promise<void> {
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: ghHeaders(),
      body: JSON.stringify({ ref: 'main', inputs }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (res.status !== 204) {
    const err = await res.text();
    throw new Error(`GH Actions error ${res.status}: ${err}`);
  }
}

/** Ostatnie runy workflow */
export async function listGHRuns(
  owner: string,
  repo: string,
  workflow: string,
  limit = 3
): Promise<{ id: number; status: string; conclusion: string | null; created_at: string; html_url: string }[]> {
  interface RunsResponse { workflow_runs: { id: number; status: string; conclusion: string | null; created_at: string; html_url: string }[] }
  const res = await fetch(
    `${GH_API}/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=${limit}`,
    { headers: ghHeaders(), signal: AbortSignal.timeout(TIMEOUT_MS) }
  );
  if (!res.ok) throw new Error(`GH API ${res.status}`);
  const data = await res.json() as RunsResponse;
  return data.workflow_runs.slice(0, limit);
}
