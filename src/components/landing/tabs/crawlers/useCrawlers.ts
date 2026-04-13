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

export function useCrawlers() {
  const [crawlersData, setCrawlersData] = useState<any>(null);

  const [crawlersPeriod, setCrawlersPeriod] = useState("24h");

  const [crawlersLoading, setCrawlersLoading] = useState(false);

  const [crawlerProfiles, setCrawlerProfiles] = useState<any[]>([]);

  const [crawlerFilter, setCrawlerFilter] = useState("all");

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboLoading, setJimboLoading] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [crawlUrl, setCrawlUrl] = useState("");

  const [crawlResult, setCrawlResult] = useState<any>(null);

  const [kbItems, setKbItems] = useState<any[]>([]);

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

  const loadCrawlers = useCallback(async () => {
    setCrawlersLoading(true);
    const [historyData, profilesData] = await Promise.all([
      apiFetch(`/api/crawlers/history?period=${crawlersPeriod}`),
      crawlerProfiles.length === 0
        ? apiFetch("/api/crawlers/profiles")
        : Promise.resolve(null),
    ]);
    if (historyData) setCrawlersData(historyData);
    if (profilesData?.profiles) setCrawlerProfiles(profilesData.profiles);
    setCrawlersLoading(false);
  }, [crawlersPeriod, crawlerProfiles.length]);

  const handleJimboCrawl = useCallback(
    async (url?: string) => {
      const target = (url ?? crawlUrl).trim();
      if (!target) return;
      setJimboLoading(true);
      setJimboResponse("");
      setJimboToolEvents([]);

      const online = await isJimboOnline();
      setJimboOnline(online);

      if (online) {
        jimboStream(
          `Pobierz i podsumuj: ${target}`,
          `crawl-${Date.now()}`,
          (chunk) => setJimboResponse((prev) => `${prev}${chunk}`),
          (full) => {
            const text = full || "Brak odpowiedzi z JIMbo.";
            setJimboResponse(text);
            setCrawlResult({ url: target, summary: text });
            setJimboLoading(false);
          },
          (tool, result) => {
            if (tool.includes("search")) {
              setJimboToolEvents((prev) => [
                ...prev,
                `💡 Szukam: ${result || target}`,
              ]);
            } else if (tool.includes("fetch") || tool.includes("url")) {
              setJimboToolEvents((prev) => [
                ...prev,
                `🔗 Pobieram: ${result || target}`,
              ]);
            }
          },
        );
        return;
      }

      const fallback = await apiFetch("/api/crawl/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      setCrawlResult(fallback);
      setJimboResponse("JIMbo offline - użyto fallback crawl.");
      setJimboLoading(false);
    },
    [crawlUrl],
  );

  const handleKbSave = useCallback(
    async (doc?: any) => {
      const payload = doc ?? crawlResult;
      if (!payload) return;
      const saved = await cfGateway<any>("/api/kb/save", payload, "POST");
      if (saved) {
        setKbItems((prev) => [saved, ...prev]);
        setJimboResponse("✅ Zapisano dokument do KB.");
      } else {
        setJimboResponse("Nie udało się zapisać do KB.");
      }
    },
    [crawlResult],
  );

  return {
    crawlersData,
    setCrawlersData,
    crawlersPeriod,
    setCrawlersPeriod,
    crawlersLoading,
    setCrawlersLoading,
    crawlerProfiles,
    setCrawlerProfiles,
    crawlerFilter,
    setCrawlerFilter,
    jimboOnline,
    setJimboOnline,
    jimboLoading,
    setJimboLoading,
    jimboResponse,
    setJimboResponse,
    jimboToolEvents,
    setJimboToolEvents,
    crawlUrl,
    setCrawlUrl,
    crawlResult,
    setCrawlResult,
    kbItems,
    setKbItems,
    loadCrawlers,
    handleJimboCrawl,
    handleKbSave,
  };
}
