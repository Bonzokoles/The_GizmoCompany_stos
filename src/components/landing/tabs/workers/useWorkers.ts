// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";

export function useWorkers() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);

  const [workerFilter, setWorkerFilter] = useState("all");

  const [workersLoading, setWorkersLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboLoading, setJimboLoading] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [workerLogs, setWorkerLogs] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await isJimboOnline();
      if (mounted) setJimboOnline(ok);
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const loadWorkers = useCallback(async () => {
    setWorkersLoading(true);
    const data = await apiFetch("/api/workers/list");
    if (data?.workers) setWorkers(data.workers);
    setWorkersLoading(false);
  }, []);

  const healthCheckWorkers = useCallback(async () => {
    setWorkersLoading(true);
    const data = await apiFetch("/api/workers/health", { method: "POST" });
    if (data?.results) {
      setWorkers((prev) =>
        prev.map((w) => {
          const result = data.results.find((r: any) => r.name === w.name);
          return result
            ? { ...w, status: result.status, latency: result.latencyMs }
            : w;
        }),
      );
    }
    setWorkersLoading(false);
  }, []);

  const handleAnalyzeLogs = useCallback(async (name: string) => {
    if (!name) return;
    setJimboLoading(true);
    setJimboToolEvents([]);
    setJimboResponse("");

    const logsData = await cfGateway<{ logs?: string }>(
      `/api/workers/logs/${name}`,
      undefined,
      "GET",
    );
    const logs = logsData?.logs || "Brak logów";
    setWorkerLogs((prev) => ({ ...prev, [name]: logs }));

    const online = await isJimboOnline();
    setJimboOnline(online);

    if (!online) {
      setJimboResponse(
        "JIMbo jest offline. Analiza logów jest chwilowo niedostępna.",
      );
      setJimboLoading(false);
      return;
    }

    const text = await jimboChat(`Przeanalizuj logi workera ${name}: ${logs}`);
    setJimboToolEvents([`💡 Szukam: analiza logów ${name}`]);
    setJimboResponse(text || "Brak odpowiedzi z JIMbo.");
    setJimboLoading(false);
  }, []);

  const handleDeployWorker = useCallback(async (name: string) => {
    if (!name) return;
    setJimboLoading(true);
    const result = await cfGateway<{ ok?: boolean; message?: string }>(
      "/api/workers/deploy",
      { name },
      "POST",
    );
    if (result?.ok) {
      setJimboResponse(`✅ Worker ${name} został wysłany do deploy.`);
      setJimboToolEvents([`🔗 Pobieram: deploy ${name}`]);
    } else {
      setJimboResponse(
        result?.message || `Nie udało się uruchomić deploy dla ${name}.`,
      );
    }
    setJimboLoading(false);
  }, []);

  return {
    workers,
    setWorkers,
    workerFilter,
    setWorkerFilter,
    workersLoading,
    setWorkersLoading,
    jimboOnline,
    setJimboOnline,
    jimboLoading,
    setJimboLoading,
    jimboResponse,
    setJimboResponse,
    jimboToolEvents,
    setJimboToolEvents,
    workerLogs,
    setWorkerLogs,
    loadWorkers,
    healthCheckWorkers,
    handleAnalyzeLogs,
    handleDeployWorker,
  };
}
