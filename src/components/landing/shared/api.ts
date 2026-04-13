export async function apiFetch<T = any>(
  url: string,
  opts?: RequestInit,
): Promise<T | null> {
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
    const data = await r.json();
    return data as T;
  } catch {
    return null;
  }
}
