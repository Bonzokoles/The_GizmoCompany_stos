// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, isJimboOnline } from "../../shared/jimboClient";

export function useAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const [analyticsPeriod, setAnalyticsPeriod] = useState("24h");

  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [analyticsInsights, setAnalyticsInsights] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [analyticsSource, setAnalyticsSource] =
    useState<AnalyticsSource>("mybonzo");

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

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    const sourceConfig =
      ANALYTICS_SOURCES.find((s) => s.id === analyticsSource) ||
      ANALYTICS_SOURCES[0];
    const separator = sourceConfig.endpoint.includes("?") ? "&" : "?";
    const data = await apiFetch(
      `${sourceConfig.endpoint}${separator}period=${analyticsPeriod}`,
    );
    setAnalyticsData(data);
    setAnalyticsLoading(false);
  }, [analyticsPeriod, analyticsSource]);

  const handleAiAnalysis = useCallback(async () => {
    if (!analyticsData) return;
    setAnalysisLoading(true);
    setAnalyticsInsights("");

    const online = await isJimboOnline();
    setJimboOnline(online);

    if (!online) {
      setAnalyticsInsights(
        "JIMbo jest offline. Najpierw odśwież dane i spróbuj ponownie.",
      );
      setAnalysisLoading(false);
      return;
    }

    const text = await jimboChat(
      `Przeanalizuj dane analytics: ${JSON.stringify(analyticsData)}. Podaj wnioski i rekomendacje po polsku.`,
      `analytics-${Date.now()}`,
    );
    setAnalyticsInsights(text || "Brak odpowiedzi z JIMbo.");
    setAnalysisLoading(false);
  }, [analyticsData]);

  return {
    analyticsData,
    setAnalyticsData,
    analyticsPeriod,
    setAnalyticsPeriod,
    analyticsLoading,
    setAnalyticsLoading,
    jimboOnline,
    setJimboOnline,
    analyticsInsights,
    setAnalyticsInsights,
    analysisLoading,
    setAnalysisLoading,
    analyticsSource,
    setAnalyticsSource,
    loadAnalytics,
    handleAiAnalysis,
  };
}
