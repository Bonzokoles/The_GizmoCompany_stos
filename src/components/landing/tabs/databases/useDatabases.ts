// @ts-nocheck
import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../shared/api";
import { ANALYTICS_SOURCES } from "../../shared/constants";
import { jimboChat, isJimboOnline } from "../../shared/jimboClient";

export function useDatabases() {
  const [databases, setDatabases] = useState<DbInfo[]>([]);

  const [selectedDb, setSelectedDb] = useState("");

  const [dbTables, setDbTables] = useState<string[]>([]);

  const [sqlQuery, setSqlQuery] = useState("");

  const [queryResult, setQueryResult] = useState<any>(null);

  const [dbLoading, setDbLoading] = useState(false);

  const [jimboOnline, setJimboOnline] = useState(false);

  const [nlQuery, setNlQuery] = useState("");

  const [generatedSql, setGeneratedSql] = useState("");

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

  const loadDatabases = useCallback(async () => {
    setDbLoading(true);
    const data = await apiFetch("/api/db/databases");
    if (data?.databases) setDatabases(data.databases);
    setDbLoading(false);
  }, []);

  const loadTables = useCallback(async (dbId: string) => {
    setSelectedDb(dbId);
    setDbLoading(true);
    const data = await apiFetch(`/api/db/tables/${dbId}`);
    setDbTables(data?.tables || []);
    setDbLoading(false);
  }, []);

  const runQuery = useCallback(async () => {
    if (!selectedDb || !sqlQuery.trim()) return;
    setDbLoading(true);
    setQueryResult(null);
    const data = await apiFetch(`/api/db/query/${selectedDb}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: sqlQuery }),
    });
    setQueryResult(data);
    setDbLoading(false);
  }, [selectedDb, sqlQuery]);

  const handleNlToSql = useCallback(
    async (nl?: string) => {
      const text = (nl ?? nlQuery).trim();
      if (!text) return;
      const online = await isJimboOnline();
      setJimboOnline(online);
      if (!online) {
        setGeneratedSql("-- JIMbo offline. Wpisz SQL ręcznie.");
        return;
      }
      const sql = await jimboChat(`Przetlumacz na SQL dla D1 SQLite: ${text}`);
      setGeneratedSql(sql || "-- Brak odpowiedzi");
      setSqlQuery(sql || "");
    },
    [nlQuery],
  );

  const handleExecuteSql = useCallback(
    async (sql?: string, dbId?: string) => {
      const finalSql = (sql ?? sqlQuery).trim();
      const targetDb = dbId ?? selectedDb;
      if (!finalSql || !targetDb) return;
      setDbLoading(true);
      const data = await apiFetch(`/api/db/query/${targetDb}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: finalSql }),
      });
      setQueryResult(data);
      setDbLoading(false);
    },
    [sqlQuery, selectedDb],
  );

  return {
    databases,
    setDatabases,
    selectedDb,
    setSelectedDb,
    dbTables,
    setDbTables,
    sqlQuery,
    setSqlQuery,
    queryResult,
    setQueryResult,
    dbLoading,
    setDbLoading,
    jimboOnline,
    setJimboOnline,
    nlQuery,
    setNlQuery,
    generatedSql,
    setGeneratedSql,
    loadDatabases,
    loadTables,
    runQuery,
    handleNlToSql,
    handleExecuteSql,
  };
}
