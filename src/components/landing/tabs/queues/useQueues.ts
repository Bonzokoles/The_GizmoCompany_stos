// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";

export function useQueues() {
  const [queueName, setQueueName] = useState<string>("agent-tasks");

  const [queueAction, setQueueAction] = useState("summarize");

  const [queuePrompt, setQueuePrompt] = useState("");

  const [queueResult, setQueueResult] = useState<any>(null);

  const [queueLoading, setQueueLoading] = useState(false);

  const [consumerHealth, setConsumerHealth] = useState<any>(null);

  const [recentResults, setRecentResults] = useState<any[]>([]);

  const [queueTaskId, setQueueTaskId] = useState("");

  const [queueLookupResult, setQueueLookupResult] = useState<any>(null);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [queueList, setQueueList] = useState<any[]>([]);

  const [messagePayload, setMessagePayload] = useState("");

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

  const loadConsumerHealth = useCallback(async () => {
    // Używamy własnego CF Function zamiast zewnętrznego consumer worker
    const data = await apiFetch("/api/queues/status");
    setConsumerHealth(data);
    const list = await cfGateway<any>("/api/queues/list", undefined, "GET");
    if (list?.queues) setQueueList(list.queues);
  }, []);

  const handleQueueSend = useCallback(async () => {
    if (!queuePrompt.trim()) return;
    setQueueLoading(true);
    setQueueResult(null);
    const actionMap: Record<string, any> = {
      "agent-tasks": { action: queueAction, prompt: queuePrompt },
      "image-gen": { action: "generate", prompt: queuePrompt },
      "image-proc": { action: "analyze", url: queuePrompt },
      voice: { action: "transcribe", url: queuePrompt },
    };
    const data = await apiFetch("/api/queues/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queue: queueName,
        data: actionMap[queueName] || { prompt: queuePrompt },
      }),
    });
    setQueueResult(data);
    setQueueLoading(false);
  }, [queueName, queueAction, queuePrompt]);

  const handleQueueLookup = useCallback(async () => {
    if (!queueTaskId.trim()) return;
    setQueueLookupResult({
      info:
        "Task lookup wymaga consumer worker (external). TaskId: " + queueTaskId,
    });
  }, [queueTaskId]);

  const loadRecentResults = useCallback(async () => {
    // Recent results zależą od consumer worker — pokazujemy info zamiast błędu
    setRecentResults([]);
  }, []);

  const handleSendMessage = useCallback(
    async (queue: string, payload: string) => {
      if (!queue || !payload.trim()) return;
      const data = await cfGateway<any>(
        `/api/queues/${queue}/send`,
        { payload },
        "POST",
      );
      setQueueResult(data);
    },
    [],
  );

  const handleQueueStats = useCallback(
    async (queue: string) => {
      if (!queue) return;
      const stats = await cfGateway<any>(
        `/api/queues/${queue}/stats`,
        undefined,
        "GET",
      );
      const online = await isJimboOnline();
      setJimboOnline(online);
      if (!online) {
        setJimboResponse(
          JSON.stringify(stats ?? { info: "JIMbo offline" }, null, 2),
        );
        return;
      }
      const text = await jimboChat(
        `Zbuduj payload JSON dla kolejki ${queue}: ${messagePayload || "opis"}`,
      );
      setJimboResponse(text || "Brak odpowiedzi z JIMbo.");
    },
    [messagePayload],
  );

  return {
    queueName,
    setQueueName,
    queueAction,
    setQueueAction,
    queuePrompt,
    setQueuePrompt,
    queueResult,
    setQueueResult,
    queueLoading,
    setQueueLoading,
    consumerHealth,
    setConsumerHealth,
    recentResults,
    setRecentResults,
    queueTaskId,
    setQueueTaskId,
    queueLookupResult,
    setQueueLookupResult,
    jimboOnline,
    setJimboOnline,
    jimboResponse,
    setJimboResponse,
    queueList,
    setQueueList,
    messagePayload,
    setMessagePayload,
    loadConsumerHealth,
    handleQueueSend,
    handleQueueLookup,
    loadRecentResults,
    handleSendMessage,
    handleQueueStats,
  };
}
