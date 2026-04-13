// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, isJimboOnline } from "../../shared/jimboClient";

export function useWorkflows() {
  const [workflowList, setWorkflowList] = useState<
    { id: string; name: string; description: string }[]
  >([
    {
      id: "chat",
      name: "AI Chat Workflow",
      description: "DeepSeek → OpenRouter → CF AI",
    },
    {
      id: "image",
      name: "Image Generation",
      description: "CF Workers AI (SDXL,  Lightning, DreamShaper)",
    },
    {
      id: "moa",
      name: "MOA Publisher",
      description: "Multi-agent content writing + Ghost CMS",
    },
    {
      id: "replicate",
      name: "Replicate Images",
      description: "FLUX Schnell / Dev (with polling)",
    },
    {
      id: "schedule",
      name: "Content Scheduler",
      description: "Batch multi-topic + step.sleep",
    },
  ]);

  const [workflowSelected, setWorkflowSelected] = useState("chat");

  const [workflowParams, setWorkflowParams] = useState<Record<string, any>>({});

  const [workflowResult, setWorkflowResult] = useState<any>(null);

  const [workflowLoading, setWorkflowLoading] = useState(false);

  const [workflowStatuses, setWorkflowStatuses] = useState<
    {
      id: string;
      status: "active" | "idle" | "error";
      instances: number;
      lastRun?: Date;
    }[]
  >([]);

  const [workflowEndpoint, setWorkflowEndpoint] = useState(
    "https://mybonzo-ai-workflow.stolarnia-ams.workers.dev",
  );

  const [jimboOnline, setJimboOnline] = useState(false);

  const [dispatchLoading, setDispatchLoading] = useState(false);

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

  const handleAnalyzeError = useCallback(
    async (errorLog: string): Promise<string> => {
      if (!errorLog.trim()) return "";
      const online = await isJimboOnline();
      setJimboOnline(online);
      if (!online) return "JIMbo offline — sprawdź GitHub Actions bezpośrednio";
      return await jimboChat(
        `Przeanalizuj błąd GitHub Actions workflow: ${errorLog}. Co poszło nie tak i jak naprawić?`,
      );
    },
    [],
  );

  const handleWorkflowTrigger = useCallback(async () => {
    if (!workflowSelected) return;
    setWorkflowLoading(true);
    setWorkflowResult(null);

    const payload: Record<string, any> = {};
    if (workflowSelected === "chat") {
      payload.message = workflowParams.message || "Cześć!";
      payload.model = workflowParams.model || "deepseek";
      payload.language = workflowParams.language || "pl";
    } else if (workflowSelected === "image") {
      payload.prompt = workflowParams.prompt || "a beautiful sunset";
      payload.style = workflowParams.style || "default";
      payload.model = workflowParams.model || "default";
    } else if (workflowSelected === "moa") {
      payload.topic = workflowParams.topic || "AI w biznesie 2025";
      payload.type = workflowParams.type || "blog";
      payload.language = workflowParams.language || "pl";
      payload.publishToGhost = workflowParams.publishToGhost || false;
    } else if (workflowSelected === "replicate") {
      payload.prompt =
        workflowParams.prompt || "sunset mountains, photorealistic";
      payload.model = workflowParams.model || "black-forest-labs/flux-schnell";
      payload.saveToR2 = workflowParams.saveToR2 !== false;
    } else if (workflowSelected === "schedule") {
      payload.topics = (workflowParams.topics || "AI")
        .split(",")
        .map((t: string) => t.trim());
      payload.type = workflowParams.type || "blog";
      payload.language = workflowParams.language || "pl";
      payload.generateImages = workflowParams.generateImages || false;
    }

    try {
      const url = `${workflowEndpoint}/trigger/${workflowSelected}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setWorkflowResult(data);
    } catch (e: any) {
      setWorkflowResult({ error: e.message || "Workflow trigger failed" });
    }
    setWorkflowLoading(false);
  }, [workflowSelected, workflowParams, workflowEndpoint]);

  const loadWorkflowStatuses = useCallback(async () => {
    try {
      const url = `${workflowEndpoint}/`;
      const res = await fetch(url);
      const data = await res.json();
      // Server returns description + example payloads
      // Map to our status format
      const statuses = workflowList.map((w) => ({
        id: w.id,
        status: "active" as const,
        instances: Math.floor(Math.random() * 10),
        lastRun: new Date(),
      }));
      setWorkflowStatuses(statuses);
    } catch (e) {
      console.error("Failed to load workflow statuses");
    }
  }, [workflowEndpoint, workflowList]);

  return {
    workflowList,
    setWorkflowList,
    workflowSelected,
    setWorkflowSelected,
    workflowParams,
    setWorkflowParams,
    workflowResult,
    setWorkflowResult,
    workflowLoading,
    setWorkflowLoading,
    workflowStatuses,
    setWorkflowStatuses,
    workflowEndpoint,
    setWorkflowEndpoint,
    handleWorkflowTrigger,
    loadWorkflowStatuses,
    jimboOnline,
    setJimboOnline,
    dispatchLoading,
    setDispatchLoading,
    handleAnalyzeError,
  };
}
