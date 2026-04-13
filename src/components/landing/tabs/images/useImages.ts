// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";

export function useImages() {
  const [imgPrompt, setImgPrompt] = useState("");

  const [imgStyle, setImgStyle] = useState("");

  const [imgResult, setImgResult] = useState<any>(null);

  const [imgLoading, setImgLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [imageList, setImageList] = useState<any[]>([]);

  const [altTextLoading, setAltTextLoading] = useState(false);

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

  const handleImageGenerate = useCallback(async () => {
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    setImgResult(null);
    const data = await apiFetch("/api/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: imgPrompt,
        style: imgStyle,
        width: 1024,
        height: 1024,
      }),
    });
    setImgResult(data);
    setImgLoading(false);
  }, [imgPrompt, imgStyle]);

  const handleGenerateAltText = useCallback(
    async (filename: string, ctx: string) => {
      if (!filename) return;
      setAltTextLoading(true);
      const online = await isJimboOnline();
      setJimboOnline(online);
      if (!online) {
        setJimboResponse("JIMbo offline. Wygeneruj opis ręcznie.");
        setAltTextLoading(false);
        return;
      }
      const text = await jimboChat(
        `Napisz SEO alt-text (max 125 znakow) dla: ${filename} kontekst: ${ctx || "brak"}`,
      );
      setJimboResponse(text || "Brak odpowiedzi z JIMbo.");
      setAltTextLoading(false);
    },
    [],
  );

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    const data = await cfGateway<any>(
      "/api/r2/images/upload",
      { name: file.name },
      "POST",
    );
    if (data) {
      setImageList((prev) => [{ key: file.name }, ...prev]);
    }
  }, []);

  return {
    imgPrompt,
    setImgPrompt,
    imgStyle,
    setImgStyle,
    imgResult,
    setImgResult,
    imgLoading,
    setImgLoading,
    jimboOnline,
    setJimboOnline,
    jimboResponse,
    setJimboResponse,
    imageList,
    setImageList,
    altTextLoading,
    setAltTextLoading,
    handleImageGenerate,
    handleGenerateAltText,
    handleImageUpload,
  };
}
