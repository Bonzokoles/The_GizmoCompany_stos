// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, cfGateway, isJimboOnline } from "../../shared/jimboClient";

export function useStorage() {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);

  const [selectedBucket, setSelectedBucket] = useState("");

  const [bucketObjects, setBucketObjects] = useState<any[]>([]);

  const [storageLoading, setStorageLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [jimboLoading, setJimboLoading] = useState(false);

  const [jimboResponse, setJimboResponse] = useState("");

  const [jimboToolEvents, setJimboToolEvents] = useState<string[]>([]);

  const [bucketFiles, setBucketFiles] = useState<any[]>([]);

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

  const loadBuckets = useCallback(async () => {
    setStorageLoading(true);
    const data = await apiFetch("/api/storage/buckets");
    if (data?.buckets) setBuckets(data.buckets);
    setStorageLoading(false);
  }, []);

  const browseBucket = useCallback(async (bucket: string) => {
    setSelectedBucket(bucket);
    setStorageLoading(true);
    const data = await apiFetch(`/api/storage/browse/${bucket}`);
    setBucketObjects(data?.objects || []);
    setBucketFiles(data?.objects || []);
    setStorageLoading(false);
  }, []);

  const handleListBucket = useCallback(
    async (name: string) => {
      await browseBucket(name);
    },
    [browseBucket],
  );

  const handleUploadFile = useCallback(async (file: File, bucket: string) => {
    if (!file || !bucket) return;
    setJimboLoading(true);
    const data = await cfGateway<any>(
      `/api/r2/${bucket}/upload`,
      { name: file.name },
      "POST",
    );
    setJimboResponse(
      data ? `✅ Wysłano ${file.name} do ${bucket}` : "Upload nieudany.",
    );
    setJimboLoading(false);
  }, []);

  const handleDeleteFile = useCallback(async (bucket: string, key: string) => {
    if (!bucket || !key) return;
    setJimboLoading(true);
    await cfGateway(
      `/api/r2/${bucket}/${encodeURIComponent(key)}`,
      undefined,
      "DELETE",
    );
    setBucketFiles((prev) => prev.filter((f) => f.key !== key));
    setJimboResponse(`🗑️ Usunięto ${key}`);
    setJimboLoading(false);
  }, []);

  const handleAskStorage = useCallback(async () => {
    if (!selectedBucket) return;
    const online = await isJimboOnline();
    setJimboOnline(online);
    if (!online) {
      setJimboResponse("JIMbo offline. Sprawdź ręcznie w CF Dashboard.");
      return;
    }
    const text = await jimboChat(
      `Co jest w buckecie ${selectedBucket}? Opisz zawartość i zaproponuj organizację.`,
    );
    setJimboToolEvents([`💡 Szukam: ${selectedBucket}`]);
    setJimboResponse(text || "Brak odpowiedzi z JIMbo.");
  }, [selectedBucket]);

  return {
    buckets,
    setBuckets,
    selectedBucket,
    setSelectedBucket,
    bucketObjects,
    setBucketObjects,
    bucketFiles,
    setBucketFiles,
    storageLoading,
    setStorageLoading,
    jimboOnline,
    setJimboOnline,
    jimboLoading,
    setJimboLoading,
    jimboResponse,
    setJimboResponse,
    jimboToolEvents,
    setJimboToolEvents,
    loadBuckets,
    browseBucket,
    handleListBucket,
    handleUploadFile,
    handleDeleteFile,
    handleAskStorage,
  };
}
