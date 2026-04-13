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

export function useAiHub() {
  const [aiHubPrompt, setAiHubPrompt] = useState("");

  const [aiHubProvider, setAiHubProvider] = useState("deepseek");

  const [aiHubResponse, setAiHubResponse] = useState<any>(null);

  const [aiHubLoading, setAiHubLoading] = useState(false);

  const [aiHubHistory, setAiHubHistory] = useState<
    { role: string; text: string; provider: string; tokens?: number }[]
  >([]);

  const [aiProvidersStatus, setAiProvidersStatus] = useState<
    { name: string; status: string }[]
  >([]);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [streamContent, setStreamContent] = useState("");

  const [toolEvents, setToolEvents] = useState<
    { tool: string; result: string }[]
  >([]);

  const [sessionId, setSessionId] = useState(`aihub-${Date.now()}`);

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

  const handleAiHubChat = useCallback(async () => {
    if (!aiHubPrompt.trim()) return;
    setAiHubLoading(true);
    setAiHubResponse(null);
    const userText = aiHubPrompt;
    setAiHubPrompt("");
    setAiHubHistory((prev) => [
      ...prev,
      { role: "user", text: userText, provider: aiHubProvider },
    ]);

    const data = await apiFetch<any>("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userText,
        provider: aiHubProvider,
        maxTokens: 2048,
      }),
    });

    const reply = data?.content || data?.error || "Brak odpowiedzi";
    const tokens = data?.usage?.total_tokens || data?.tokens;
    setAiHubResponse(data);
    setAiHubHistory((prev) => [
      ...prev,
      {
        role: "ai",
        text: reply,
        provider: data?.provider || aiHubProvider,
        tokens,
      },
    ]);
    setAiHubLoading(false);
  }, [aiHubPrompt, aiHubProvider]);

  const loadAiProviders = useCallback(async () => {
    const providers = ["deepseek", "openrouter", "anthropic", "workers-ai"];
    const statuses = await Promise.all(
      providers.map(async (p) => {
        const ok = await apiFetch(`/api/ai/status?provider=${p}`);
        return { name: p, status: ok?.ok ? "online" : "offline" };
      }),
    );
    setAiProvidersStatus(statuses);
  }, []);

  const handleStreamChat = useCallback(
    async (prompt?: string) => {
      const p = (prompt ?? aiHubPrompt).trim();
      if (!p) return;

      const sid = `aihub-${Date.now()}`;
      setSessionId(sid);
      setAiHubLoading(true);
      setStreamContent("");
      setToolEvents([]);

      const online = await isJimboOnline();
      setJimboOnline(online);

      if (online) {
        jimboStream(
          p,
          sid,
          (chunk) => setStreamContent((prev) => `${prev}${chunk}`),
          (full) => {
            const reply = full || "Brak odpowiedzi z JIMbo.";
            setAiHubHistory((prev) => [
              ...prev,
              { role: "user", text: p, provider: aiHubProvider },
              { role: "ai", text: reply, provider: "jimbo" },
            ]);
            setAiHubLoading(false);
          },
          (tool, result) => {
            setToolEvents((prev) => [...prev, { tool, result }]);
          },
        );
        return;
      }

      const fallback = await cfGateway<any>(
        "/api/ai/chat",
        { prompt: p, provider: "workers-ai" },
        "POST",
      );
      const reply = fallback?.content || "Brak odpowiedzi fallback.";
      setStreamContent(reply);
      setAiHubHistory((prev) => [
        ...prev,
        { role: "user", text: p, provider: aiHubProvider },
        { role: "ai", text: reply, provider: "workers-ai" },
      ]);
      setAiHubLoading(false);
    },
    [aiHubPrompt, aiHubProvider],
  );

  return {
    aiHubPrompt,
    setAiHubPrompt,
    aiHubProvider,
    setAiHubProvider,
    aiHubResponse,
    setAiHubResponse,
    aiHubLoading,
    setAiHubLoading,
    aiHubHistory,
    setAiHubHistory,
    aiProvidersStatus,
    setAiProvidersStatus,
    jimboOnline,
    setJimboOnline,
    streamContent,
    setStreamContent,
    toolEvents,
    setToolEvents,
    sessionId,
    setSessionId,
    handleAiHubChat,
    handleStreamChat,
    loadAiProviders,
  };
}
