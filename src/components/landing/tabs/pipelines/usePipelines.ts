// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import {
  jimboChat,
  jimboStream,
  cfGateway,
  isJimboOnline,
} from "../../shared/jimboClient";

export function usePipelines() {
  const [pipelinesData, setPipelinesData] = useState<any>(null);

  const [pipelinesLoading, setPipelinesLoading] = useState(false);

  const [pipelineFilter, setPipelineFilter] = useState("all");

  const [pipelineEvents, setPipelineEvents] = useState<any[]>([]);

  const [pipelineStats, setPipelineStats] = useState<any>(null);

  const [ingestPipeline, setIngestPipeline] = useState("");

  const [ingestType, setIngestType] = useState("");

  const [ingestPayload, setIngestPayload] = useState("{}");

  const [ingestResult, setIngestResult] = useState<any>(null);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboLoading, setJimboLoading] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [pipelineStatus, setPipelineStatus] = useState<Record<string, string>>(
    {},
  );

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

  const loadPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    const [listData, statsData, eventsData] = await Promise.all([
      apiFetch("/api/pipelines/list"),
      apiFetch("/api/pipelines/stats"),
      apiFetch("/api/pipelines/events?limit=20"),
    ]);
    if (listData) setPipelinesData(listData);
    if (statsData) setPipelineStats(statsData);
    if (eventsData?.events) setPipelineEvents(eventsData.events);
    setPipelinesLoading(false);
  }, []);

  const handleIngest = useCallback(async () => {
    if (!ingestPipeline || !ingestType) return;
    setIngestResult(null);
    let payload = {};
    try {
      payload = JSON.parse(ingestPayload);
    } catch {
      /* use empty */
    }
    const data = await apiFetch("/api/pipelines/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline_id: ingestPipeline,
        event_type: ingestType,
        payload,
        source: "dashboard",
      }),
    });
    setIngestResult(data);
    if (data?.success) loadPipelines();
  }, [ingestPipeline, ingestType, ingestPayload, loadPipelines]);

  const handleRunPipeline = useCallback(async (name: string) => {
    if (!name) return;
    setJimboLoading(true);
    setJimboResponse("");
    const run = await cfGateway<{
      id?: string;
      status?: string;
      error?: string;
    }>(`/api/pipelines/run/${name}`, {}, "POST");
    if (run?.id) {
      setPipelineStatus((prev) => ({
        ...prev,
        [run.id!]: run.status || "running",
      }));
      setJimboResponse(`✅ Pipeline ${name} uruchomiony (ID: ${run.id}).`);
    } else {
      setJimboResponse(
        run?.error || `Nie udało się uruchomić pipeline ${name}.`,
      );
    }
    setJimboLoading(false);
  }, []);

  const handleMonitorPipeline = useCallback(async (id: string) => {
    if (!id) return;
    setJimboLoading(true);
    setJimboToolEvents([]);
    const status = await cfGateway<{ status?: string; result?: unknown }>(
      `/api/pipelines/status/${id}`,
      undefined,
      "GET",
    );
    setPipelineStatus((prev) => ({
      ...prev,
      [id]: status?.status || "unknown",
    }));

    const online = await isJimboOnline();
    setJimboOnline(online);

    if (online) {
      jimboStream(
        `Opisz wynik pipeline ${id}`,
        `pipeline-${id}-${Date.now()}`,
        (chunk) => setJimboResponse((prev) => `${prev}${chunk}`),
        (full) => setJimboResponse(full || "Brak odpowiedzi z JIMbo."),
        (tool, result) => {
          if (tool.includes("search")) {
            setJimboToolEvents((prev) => [
              ...prev,
              `💡 Szukam: ${result || id}`,
            ]);
          } else if (tool.includes("fetch") || tool.includes("url")) {
            setJimboToolEvents((prev) => [
              ...prev,
              `🔗 Pobieram: ${result || "status"}`,
            ]);
          }
        },
      );
    } else {
      const text = await jimboChat(
        `Opisz wynik pipeline: ${JSON.stringify(status)}`,
      );
      setJimboResponse(text || "JIMbo offline - pokazuję status surowy.");
    }
    setJimboLoading(false);
  }, []);

  return {
    pipelinesData,
    setPipelinesData,
    pipelinesLoading,
    setPipelinesLoading,
    pipelineFilter,
    setPipelineFilter,
    pipelineEvents,
    setPipelineEvents,
    pipelineStats,
    setPipelineStats,
    ingestPipeline,
    setIngestPipeline,
    ingestType,
    setIngestType,
    ingestPayload,
    setIngestPayload,
    ingestResult,
    setIngestResult,
    jimboOnline,
    setJimboOnline,
    jimboLoading,
    setJimboLoading,
    jimboResponse,
    setJimboResponse,
    jimboToolEvents,
    setJimboToolEvents,
    pipelineStatus,
    setPipelineStatus,
    loadPipelines,
    handleIngest,
    handleRunPipeline,
    handleMonitorPipeline,
  };
}
