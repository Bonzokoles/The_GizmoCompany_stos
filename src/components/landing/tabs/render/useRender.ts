// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";

export function useRender() {
  const [renderUrl, setRenderUrl] = useState("");

  const [renderAction, setRenderAction] = useState<
    "screenshot" | "pdf" | "scrape" | "markdown" | "json"
  >("screenshot");

  const [renderSelectors, setRenderSelectors] = useState("h1, h2, p, a");

  const [renderPrompt, setRenderPrompt] = useState("");

  const [renderResult, setRenderResult] = useState<any>(null);

  const [renderLoading, setRenderLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [deployments, setDeployments] = useState<any[]>([]);

  const [deployLog, setDeployLog] = useState("");

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

  const handleRender = useCallback(async () => {
    if (!renderUrl.trim()) return;
    setRenderLoading(true);
    setRenderResult(null);
    const payload: any = { url: renderUrl };
    if (renderAction === "scrape") {
      payload.selectors = renderSelectors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (renderAction === "json") {
      payload.prompt =
        renderPrompt || "Extract the main content and key information";
    }
    const data = await apiFetch(`/api/render/${renderAction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setRenderResult(data);
    setRenderLoading(false);
  }, [renderUrl, renderAction, renderSelectors, renderPrompt]);

  const handleTriggerDeploy = useCallback(async (project: string) => {
    const data = await cfGateway<any>("/api/pages/deploy", { project }, "POST");
    if (data) setDeployments((prev) => [data, ...prev]);
  }, []);

  const handleAnalyzeDeployError = useCallback(
    async (log?: string) => {
      const content = (log ?? deployLog).trim();
      if (!content) return;
      const online = await isJimboOnline();
      setJimboOnline(online);
      if (!online) {
        setJimboResponse("JIMbo offline. Sprawdź logi w Cloudflare Dashboard.");
        return;
      }
      const text = await jimboChat(
        `Przeanalizuj blad deploy: ${content}. Co poszlo nie tak i jak naprawic?`,
      );
      setJimboResponse(text || "Brak odpowiedzi z JIMbo.");
    },
    [deployLog],
  );

  return {
    renderUrl,
    setRenderUrl,
    renderAction,
    setRenderAction,
    renderSelectors,
    setRenderSelectors,
    renderPrompt,
    setRenderPrompt,
    renderResult,
    setRenderResult,
    renderLoading,
    setRenderLoading,
    jimboOnline,
    setJimboOnline,
    jimboResponse,
    setJimboResponse,
    deployments,
    setDeployments,
    deployLog,
    setDeployLog,
    handleRender,
    handleTriggerDeploy,
    handleAnalyzeDeployError,
  };
}
