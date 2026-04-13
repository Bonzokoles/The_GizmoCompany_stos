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

export function useOverview() {
  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const [searching, setSearching] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");

  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [jimboLoading, setJimboLoading] = useState(false);

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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    const data = await apiFetch("/api/search/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, limit: 10 }),
    });
    setSearchResults(data?.results || []);
    setSearching(false);
  }, [searchQuery]);

  const handleAI = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    const data = await apiFetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: aiPrompt, maxTokens: 2048 }),
    });
    setAiResponse(data?.content || data?.error || "No response");
    setAiLoading(false);
  }, [aiPrompt]);

  const handleJimboSearch = useCallback(
    async (query?: string) => {
      const q = (query ?? searchQuery).trim();
      if (!q) return;

      setSearching(true);
      setAiResponse(null);
      setJimboToolEvents([]);

      const online = await isJimboOnline();
      setJimboOnline(online);

      if (online) {
        setJimboLoading(true);
        jimboStream(
          `Wyszukaj: ${q}`,
          `overview-search-${Date.now()}`,
          (chunk) => {
            setAiResponse((prev) => `${prev ?? ""}${chunk}`);
          },
          (full) => {
            setAiResponse(full || "Brak odpowiedzi z JIMbo.");
            setSearching(false);
            setJimboLoading(false);
          },
          (tool, result) => {
            if (tool.includes("search")) {
              setJimboToolEvents((prev) => [
                ...prev,
                `💡 Szukam: ${result || q}`,
              ]);
            } else if (tool.includes("fetch") || tool.includes("url")) {
              setJimboToolEvents((prev) => [
                ...prev,
                `🔗 Pobieram: ${result || "URL"}`,
              ]);
            }
          },
        );
        return;
      }

      const data = await apiFetch("/api/search/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10 }),
      });
      setSearchResults(data?.results || []);
      setAiResponse("JIMbo jest offline - pokazuję wyniki fallback.");
      setSearching(false);
    },
    [searchQuery],
  );

  const handleJimboAsk = useCallback(
    async (prompt?: string) => {
      const p = (prompt ?? aiPrompt).trim();
      if (!p) return;

      setAiLoading(true);
      setJimboLoading(true);
      setAiResponse(null);
      setJimboToolEvents([]);

      const online = await isJimboOnline();
      setJimboOnline(online);

      if (!online) {
        const fallback = await apiFetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: p, maxTokens: 2048 }),
        });
        setAiResponse(
          fallback?.content ||
            "JIMbo jest offline. Pokazuję odpowiedź z fallback API.",
        );
        setAiLoading(false);
        setJimboLoading(false);
        return;
      }

      try {
        const workers = await cfGateway(
          "/api/workers/status",
          undefined,
          "GET",
        );
        const analytics = await cfGateway(
          "/api/analytics/summary",
          undefined,
          "GET",
        );

        const text = await jimboChat(
          `${p}\n\nKontekst status:\n${JSON.stringify({ workers, analytics })}`,
          `overview-ask-${Date.now()}`,
        );

        setAiResponse(text || "Brak odpowiedzi z JIMbo.");
      } catch {
        setAiResponse("Nie udało się połączyć z JIMbo. Spróbuj ponownie.");
      }

      setAiLoading(false);
      setJimboLoading(false);
    },
    [aiPrompt],
  );

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searching,
    setSearching,
    aiPrompt,
    setAiPrompt,
    aiResponse,
    setAiResponse,
    aiLoading,
    setAiLoading,
    jimboOnline,
    setJimboOnline,
    jimboToolEvents,
    setJimboToolEvents,
    jimboLoading,
    setJimboLoading,
    handleSearch,
    handleAI,
    handleJimboSearch,
    handleJimboAsk,
  };
}
