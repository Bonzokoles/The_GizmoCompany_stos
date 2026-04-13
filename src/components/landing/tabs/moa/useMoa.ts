// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboStream, isJimboOnline } from "../../shared/jimboClient";

export function useMoa() {
  const [moaTopic, setMoaTopic] = useState("");

  const [moaType, setMoaType] = useState("article");

  const [moaLang, setMoaLang] = useState("pl");

  const [moaResult, setMoaResult] = useState<any>(null);

  const [moaLoading, setMoaLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [moaProfile, setMoaProfile] = useState<
    "DEFAULT" | "BLOG" | "DATA_ANALYSIS" | "SOCIAL_MEDIA" | "PRODUCT_COPY"
  >("DEFAULT");

  const [moaSource, setMoaSource] = useState("");

  const [moaStreamContent, setMoaStreamContent] = useState("");

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

  const handleMoaGenerate = useCallback(async () => {
    if (!moaTopic.trim()) return;
    setMoaLoading(true);
    setMoaResult(null);
    const data = await apiFetch("/api/moa/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: moaTopic,
        type: moaType,
        language: moaLang,
        profile: moaProfile,
      }),
    });
    setMoaResult(data);
    setMoaLoading(false);
  }, [moaTopic, moaType, moaLang, moaProfile]);

  const handleMoaStream = useCallback(async () => {
    if (!moaTopic.trim()) return;
    setMoaLoading(true);
    setMoaResult(null);
    setMoaStreamContent("");
    setJimboToolEvents([]);

    try {
      const response = await fetch(
        "https://mybonzo-ai-workflow.bonzokoles.workers.dev/api/moa/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: moaTopic,
            type: moaType,
            language: moaLang,
            profile: moaProfile,
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      const data = await response.json();
      if (data) {
        setMoaResult(data);
        setMoaSource("cf-worker");
        setMoaStreamContent(data.content || "");
        setMoaLoading(false);
        return;
      }
    } catch {
      // fallback to jimbo stream
    }

    const online = await isJimboOnline();
    setJimboOnline(online);
    if (!online) {
      setMoaSource("offline");
      setMoaStreamContent("Brak połączenia z CF Worker i JIMbo.");
      setMoaLoading(false);
      return;
    }

    setMoaSource("jimbo");
    jimboStream(
      `Uruchom MOA dla tematu: ${moaTopic}. type=${moaType}, language=${moaLang}, profile=${moaProfile}`,
      `moa-${Date.now()}`,
      (chunk) => setMoaStreamContent((prev) => `${prev}${chunk}`),
      (full) => {
        setMoaStreamContent(full || "Brak odpowiedzi z JIMbo.");
        setMoaLoading(false);
      },
      (tool, result) => {
        if (tool.includes("search")) {
          setJimboToolEvents((prev) => [
            ...prev,
            `💡 Szukam: ${result || moaTopic}`,
          ]);
        } else if (tool.includes("fetch") || tool.includes("url")) {
          setJimboToolEvents((prev) => [
            ...prev,
            `🔗 Pobieram: ${result || "źródło"}`,
          ]);
        }
      },
    );
  }, [moaTopic, moaType, moaLang, moaProfile]);

  return {
    moaTopic,
    setMoaTopic,
    moaType,
    setMoaType,
    moaLang,
    setMoaLang,
    moaResult,
    setMoaResult,
    moaLoading,
    setMoaLoading,
    jimboOnline,
    setJimboOnline,
    jimboToolEvents,
    setJimboToolEvents,
    moaProfile,
    setMoaProfile,
    moaSource,
    setMoaSource,
    moaStreamContent,
    setMoaStreamContent,
    handleMoaGenerate,
    handleMoaStream,
  };
}
