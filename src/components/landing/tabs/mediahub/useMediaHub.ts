// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "../../shared/api";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";
import type { MediaItem } from "./types";

export function useMediaHub() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [playingMedia, setPlayingMedia] = useState<MediaItem | null>(null);
  const [mediaFilter, setMediaFilter] = useState<
    "all" | "audio" | "video" | "image"
  >("all");
  const [generatedMetadata, setGeneratedMetadata] = useState("");
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [jimboOnline, setJimboOnline] = useState(false);
  const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

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

  const handleLoadMedia = useCallback(async (type?: string) => {
    setMediaLoading(true);
    const filter = type && type !== "all" ? `?type=${type}` : "";

    // Próbuj CF gateway najpierw
    const data = await cfGateway<{ items?: MediaItem[] }>(
      `/api/r2/media/list${filter}`,
    );
    if (data?.items) {
      setMediaList(data.items);
      setMediaLoading(false);
      return;
    }

    // Fallback: CF Pages Function
    const fallback = await apiFetch<{ items?: MediaItem[] }>(
      `/api/media/list${filter}`,
    );
    setMediaList(fallback?.items ?? []);
    setMediaLoading(false);
  }, []);

  const handleGenerateMetadata = useCallback(async (key: string) => {
    if (!key) return;
    setMetadataLoading(true);
    setGeneratedMetadata("");

    const online = await isJimboOnline();
    setJimboOnline(online);

    if (online) {
      const result = await jimboChat(
        `Wygeneruj metadane SEO dla pliku multimedialnego: "${key}". Podaj: title (max 70 znaków), description (max 160 znaków), tags (5-8 słów kluczowych oddzielonych przecinkiem). Format: JSON.`,
      );
      setGeneratedMetadata(result);
    } else {
      // Fallback: CF Workers AI przez apiFetch
      const data = await apiFetch<{ content?: string }>("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Wygeneruj metadane SEO dla pliku: "${key}". title, description, tags jako JSON.`,
          maxTokens: 300,
        }),
      });
      setGeneratedMetadata(data?.content ?? "Brak połączenia z AI");
    }

    setMetadataLoading(false);
  }, []);

  const handleSelectMedia = useCallback((item: MediaItem) => {
    setSelectedMedia(item);
    setGeneratedMetadata("");
  }, []);

  /** Pobierz URL do odtwarzania (presigned lub publiczny) */
  const handlePlayMedia = useCallback(
    async (item: MediaItem) => {
      if (playingMedia?.key === item.key) {
        setPlayingMedia(null);
        return;
      }
      // Jeśli item.url jest już ustawiony — użyj bezpośrednio
      if (item.url) {
        setPlayingMedia(item);
        return;
      }
      // Pobierz presigned URL z CF R2
      const data = await cfGateway<{ url?: string }>(
        `/api/r2/media/url?key=${encodeURIComponent(item.key)}`,
      );
      const url = data?.url;
      if (url) {
        const enriched = { ...item, url };
        setMediaList((prev) =>
          prev.map((m) => (m.key === item.key ? enriched : m)),
        );
        setPlayingMedia(enriched);
      } else {
        setPlayingMedia(item);
      }
    },
    [playingMedia],
  );

  /** Upload pliku do R2 przez CF Pages Function */
  const handleUploadMedia = useCallback(async (file: File) => {
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload error ${res.status}`);
      const data = (await res.json()) as { item?: MediaItem };
      if (data?.item) {
        setMediaList((prev) => [data.item!, ...prev]);
      } else {
        // Odśwież listę po udanym uploadzie
        await handleLoadMedia();
      }
    } catch (err) {
      console.error("MediaHub upload error:", err);
    } finally {
      setUploadLoading(false);
    }
  }, []);

  return {
    mediaList,
    setMediaList,
    mediaLoading,
    uploadLoading,
    selectedMedia,
    setSelectedMedia,
    playingMedia,
    setPlayingMedia,
    mediaFilter,
    setMediaFilter,
    generatedMetadata,
    setGeneratedMetadata,
    metadataLoading,
    jimboOnline,
    playerRef,
    handleLoadMedia,
    handleGenerateMetadata,
    handleSelectMedia,
    handlePlayMedia,
    handleUploadMedia,
  };
}
