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

export function useBizTools() {
  const [bizSearch, setBizSearch] = useState("");

  const [bizCategory, setBizCategory] = useState("all");

  const [tavilyKey, setTavilyKey] = useState(() => {
    try {
      return localStorage.getItem("zeno_tavily_key") || "";
    } catch {
      return "";
    }
  });

  const [tavilyQuery, setTavilyQuery] = useState(
    "business financial analytics tools open source 2025",
  );

  const [tavilyResults, setTavilyResults] = useState<any[]>([]);

  const [tavilyLoading, setTavilyLoading] = useState(false);

  const [tavilyError, setTavilyError] = useState("");

  const [tavilyAutoRan, setTavilyAutoRan] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [activeTool, setActiveTool] = useState("");

  const [toolResult, setToolResult] = useState("");

  const [toolHistory, setToolHistory] = useState<any[]>([]);

  const [toolEvents, setToolEvents] = useState<string[]>([]);

  const [toolLoading, setToolLoading] = useState(false);

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

  const handleTavilySearch = useCallback(
    async (queryOverride?: string) => {
      const q = queryOverride || tavilyQuery;
      if (!q.trim() || !tavilyKey.trim()) return;
      setTavilyLoading(true);
      setTavilyError("");
      setTavilyResults([]);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: q,
            max_results: 10,
            search_depth: "advanced",
            include_answer: true,
          }),
        });
        const data = await res.json();
        if (data.results) {
          setTavilyResults(data.results);
          if (data.answer)
            setTavilyResults((prev) => [
              {
                title: "AI Summary",
                url: "",
                content: data.answer,
                score: 1,
                _summary: true,
              },
              ...prev,
            ]);
        } else {
          setTavilyError(data.error || data.message || "Brak wyników");
        }
      } catch (e: any) {
        setTavilyError(e.message || "Błąd połączenia z Tavily");
      }
      setTavilyLoading(false);
    },
    [tavilyQuery, tavilyKey],
  );

  const handleRunTool = useCallback(
    async (id: string, params: Record<string, string> = {}) => {
      if (!id) return;
      setActiveTool(id);
      setToolLoading(true);
      setToolResult("");
      setToolEvents([]);

      const online = await isJimboOnline();
      setJimboOnline(online);

      const context = Object.entries(params)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      if (online) {
        jimboStream(
          `Uruchom narzędzie ${id}. Kontekst: ${context || "brak"}`,
          `biz-${id}-${Date.now()}`,
          (chunk) => setToolResult((prev) => `${prev}${chunk}`),
          (full) => {
            const text = full || "Brak odpowiedzi z JIMbo.";
            setToolResult(text);
            setToolHistory((prev) => [{ id, text, ts: Date.now() }, ...prev]);
            setToolLoading(false);
          },
          (tool, result) => {
            if (tool.includes("search")) {
              setToolEvents((prev) => [...prev, `💡 Szukam: ${result || id}`]);
            } else if (tool.includes("fetch") || tool.includes("url")) {
              setToolEvents((prev) => [
                ...prev,
                `🔗 Pobieram: ${result || id}`,
              ]);
            }
          },
        );
        return;
      }

      const fallback = await cfGateway<any>(
        "/api/biz/analyze",
        { tool: id, params },
        "POST",
      );
      const text =
        fallback?.content || fallback?.result || "Brak odpowiedzi fallback.";
      setToolResult(text);
      setToolHistory((prev) => [{ id, text, ts: Date.now() }, ...prev]);
      setToolLoading(false);
    },
    [],
  );

  return {
    bizSearch,
    setBizSearch,
    bizCategory,
    setBizCategory,
    tavilyKey,
    setTavilyKey,
    tavilyQuery,
    setTavilyQuery,
    tavilyResults,
    setTavilyResults,
    tavilyLoading,
    setTavilyLoading,
    tavilyError,
    setTavilyError,
    tavilyAutoRan,
    setTavilyAutoRan,
    jimboOnline,
    setJimboOnline,
    activeTool,
    setActiveTool,
    toolResult,
    setToolResult,
    toolHistory,
    setToolHistory,
    toolEvents,
    setToolEvents,
    toolLoading,
    setToolLoading,
    handleTavilySearch,
    handleRunTool,
  };
}
