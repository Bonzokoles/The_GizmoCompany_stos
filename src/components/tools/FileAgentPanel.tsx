/**
 * FileAgentPanel — File Agent: directory browser + file viewer + AI chat
 * Etap D: browse local filesystem, view/edit files, ask AI about them.
 */

import "../../vendor/monaco-setup"; // local workers — must be before <Editor>
import { useState, useCallback, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { FsEntry } from "../../types/electron";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileAgentPanelProps {
  onClose: () => void;
}

interface AiMessage {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JIMBO_URL = "http://localhost:4224/chat";

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript",
  ".py": "python", ".rs": "rust", ".go": "go",
  ".json": "json", ".yaml": "yaml", ".yml": "yaml",
  ".md": "markdown", ".html": "html", ".css": "css",
  ".sh": "shell", ".bash": "shell", ".ps1": "powershell",
  ".sql": "sql", ".toml": "toml", ".xml": "xml",
  ".txt": "plaintext", ".env": "plaintext",
};

const FILE_ICONS: Record<string, string> = {
  ".ts": "🟦", ".tsx": "🟦", ".js": "🟨", ".jsx": "🟨",
  ".py": "🐍", ".rs": "🦀", ".go": "🐹",
  ".json": "📋", ".yaml": "📋", ".yml": "📋",
  ".md": "📝", ".html": "🌐", ".css": "🎨",
  ".sh": "⚙", ".ps1": "⚙", ".sql": "🗄",
  ".txt": "📄", ".env": "🔑", ".toml": "📋",
};

function getIcon(entry: FsEntry): string {
  if (entry.type === "directory") return "📁";
  return FILE_ICONS[entry.extension] ?? "📄";
}

function getLang(ext: string): string {
  return EXT_LANG[ext] ?? "plaintext";
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── FileTree ─────────────────────────────────────────────────────────────────

interface FileTreeProps {
  entries: FsEntry[];
  selectedPath: string | null;
  onSelect: (entry: FsEntry) => void;
  onExpand: (entry: FsEntry) => void;
  expandedDirs: Set<string>;
  childMap: Map<string, FsEntry[]>;
  depth?: number;
}

function FileTree({
  entries, selectedPath, onSelect, onExpand,
  expandedDirs, childMap, depth = 0,
}: FileTreeProps) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {entries.map((e) => (
        <li key={e.path}>
          <button
            onClick={() => e.type === "directory" ? onExpand(e) : onSelect(e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              width: "100%",
              background: selectedPath === e.path ? "#1e3a5f" : "transparent",
              border: "none",
              color: selectedPath === e.path ? "#60a5fa" : "#d4d4d4",
              cursor: "pointer",
              padding: `3px 8px 3px ${8 + depth * 14}px`,
              fontSize: 12,
              textAlign: "left",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ fontSize: 13 }}>{getIcon(e)}</span>
            <span style={{ flexShrink: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {e.name}
            </span>
            {e.type === "file" && (
              <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 10, flexShrink: 0 }}>
                {fmtSize(e.size)}
              </span>
            )}
            {e.type === "directory" && (
              <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 10, flexShrink: 0 }}>
                {expandedDirs.has(e.path) ? "▾" : "▸"}
              </span>
            )}
          </button>
          {e.type === "directory" && expandedDirs.has(e.path) && (
            <FileTree
              entries={childMap.get(e.path) ?? []}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onExpand={onExpand}
              expandedDirs={expandedDirs}
              childMap={childMap}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── AiChat ──────────────────────────────────────────────────────────────────

interface AiChatProps {
  fileContent: string;
  fileName: string;
  language: string;
}

function AiChat({ fileContent, fileName, language }: AiChatProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (prompt: string) => {
    if (!prompt.trim() || busy) return;
    const userMsg: AiMessage = { role: "user", content: prompt };
    const loadingMsg: AiMessage = { role: "assistant", content: "", loading: true };
    setMessages((p) => [...p, userMsg, loadingMsg]);
    setInput("");
    setBusy(true);

    const context = fileContent
      ? `\nKontekst pliku (${fileName}, ${language}):\n\`\`\`${language}\n${fileContent.slice(0, 6000)}\n\`\`\``
      : "";
    const fullPrompt = `${prompt}${context}`;

    try {
      const res = await fetch(JIMBO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullPrompt, stream: true }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data) as { delta?: string; text?: string; content?: string };
              const token = parsed.delta ?? parsed.text ?? parsed.content ?? "";
              accumulated += token;
              setMessages((p) => {
                const copy = [...p];
                copy[copy.length - 1] = { role: "assistant", content: accumulated, loading: true };
                return copy;
              });
            } catch { /* skip */ }
          }
        }
      }
      setMessages((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "assistant", content: accumulated || "Brak odpowiedzi." };
        return copy;
      });
    } catch (err) {
      setMessages((p) => {
        const copy = [...p];
        copy[copy.length - 1] = { role: "assistant", content: `Błąd: ${String(err)}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }, [busy, fileContent, fileName, language]);

  const quickActions = [
    { label: "Wyjaśnij", prompt: "Wyjaśnij ten plik — co robi i jak działa?" },
    { label: "Błędy?", prompt: "Czy widzisz błędy lub problemy w tym kodzie?" },
    { label: "Refaktoryzuj", prompt: "Jak można poprawić jakość tego kodu?" },
    { label: "Testy", prompt: "Napisz przykładowe testy jednostkowe dla tego pliku." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a" }}>
      {/* Quick actions */}
      <div style={{ display: "flex", gap: 4, padding: "6px 8px", borderBottom: "1px solid #1e293b", flexWrap: "wrap" }}>
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => send(a.prompt)}
            disabled={busy}
            style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid #334155",
              background: "#1e293b", color: "#94a3b8", cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {messages.length === 0 && (
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 20 }}>
            {fileContent
              ? `Plik załadowany: ${fileName}. Zadaj pytanie o jego treść.`
              : "Otwórz plik, żeby zadać pytania AI."}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div style={{
              maxWidth: "90%", padding: "6px 10px", borderRadius: 8, fontSize: 12,
              background: m.role === "user" ? "#1e40af" : "#1e293b",
              color: m.role === "user" ? "#e0e7ff" : "#e2e8f0",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content || (m.loading ? "▋" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 4, padding: "6px 8px", borderTop: "1px solid #1e293b" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Pytaj AI o ten plik... (Enter = wyślij)"
          disabled={busy}
          rows={2}
          style={{
            flex: 1, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155",
            borderRadius: 6, padding: "4px 8px", fontSize: 12, resize: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          style={{
            padding: "0 12px", borderRadius: 6, border: "none",
            background: busy ? "#334155" : "#2563eb", color: "#fff",
            cursor: busy ? "not-allowed" : "pointer", fontSize: 13,
          }}
        >
          {busy ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FileAgentPanel({ onClose }: FileAgentPanelProps) {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [rootEntries, setRootEntries] = useState<FsEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childMap, setChildMap] = useState<Map<string, FsEntry[]>>(new Map());
  const [selectedFile, setSelectedFile] = useState<FsEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [status, setStatus] = useState("Otwórz folder, aby przeglądać pliki");
  const [aiVisible, setAiVisible] = useState(true);
  const [dirty, setDirty] = useState(false);

  const fileAPI = window.electronAPI?.file;
  const isElectron = !!fileAPI;

  // ── Open folder ────────────────────────────────────────────────────────────
  const openFolder = useCallback(async () => {
    if (!fileAPI) return;
    const folderPath = await fileAPI.openFolder(rootPath ?? undefined);
    if (!folderPath) return;
    const res = await fileAPI.list(folderPath);
    if (res.success) {
      setRootPath(folderPath);
      setRootEntries(res.entries);
      setExpandedDirs(new Set());
      setChildMap(new Map());
      setSelectedFile(null);
      setFileContent("");
      setDirty(false);
      setStatus(`Folder: ${folderPath} (${res.entries.length} elementów)`);
    } else {
      setStatus(`Błąd: ${res.error}`);
    }
  }, [fileAPI, rootPath]);

  // ── Expand/collapse directory ──────────────────────────────────────────────
  const handleExpand = useCallback(async (entry: FsEntry) => {
    if (!fileAPI) return;
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(entry.path)) {
      newExpanded.delete(entry.path);
      setExpandedDirs(newExpanded);
      return;
    }
    if (!childMap.has(entry.path)) {
      const res = await fileAPI.list(entry.path);
      if (res.success) {
        setChildMap((prev) => new Map(prev).set(entry.path, res.entries));
      }
    }
    newExpanded.add(entry.path);
    setExpandedDirs(newExpanded);
  }, [fileAPI, expandedDirs, childMap]);

  // ── Select / open file ─────────────────────────────────────────────────────
  const handleSelect = useCallback(async (entry: FsEntry) => {
    if (!fileAPI) return;
    setSelectedFile(entry);
    setLoadingFile(true);
    setStatus(`Wczytywanie: ${entry.name}…`);
    const res = await fileAPI.read(entry.path);
    setLoadingFile(false);
    if (res.success && res.content !== undefined) {
      setFileContent(res.content);
      setDirty(false);
      setStatus(`${entry.name} — ${fmtSize(res.size ?? 0)} — ${getLang(entry.extension)}`);
    } else {
      setFileContent(`// Błąd wczytywania: ${res.error}`);
      setStatus(`Błąd: ${res.error}`);
    }
  }, [fileAPI]);

  // ── Save file ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!fileAPI || !selectedFile || !dirty) return;
    const res = await fileAPI.write(selectedFile.path, fileContent);
    if (res.success) {
      setDirty(false);
      setStatus(`Zapisano: ${selectedFile.name}`);
    } else {
      setStatus(`Błąd zapisu: ${res.error}`);
    }
  }, [fileAPI, selectedFile, dirty, fileContent]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const language = selectedFile ? getLang(selectedFile.extension) : "plaintext";

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: "#1e293b", borderBottom: "1px solid #334155", flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>📁</span>
        <span style={{ fontWeight: 600, fontSize: 14, color: "#f8fafc" }}>File Agent</span>
        <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{status}</span>

        <button onClick={openFolder} style={btnStyle("#2563eb")}>
          📂 Otwórz folder
        </button>
        {selectedFile && dirty && (
          <button onClick={handleSave} style={btnStyle("#16a34a")}>
            💾 Zapisz (Ctrl+S)
          </button>
        )}
        <button
          onClick={() => setAiVisible((v) => !v)}
          style={btnStyle(aiVisible ? "#7c3aed" : "#334155")}
        >
          🤖 AI
        </button>
        <button onClick={onClose} style={btnStyle("#334155")}>✕</button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: File Tree */}
        <div style={{
          width: 220, flexShrink: 0, background: "#0f172a",
          borderRight: "1px solid #1e293b", overflowY: "auto",
        }}>
          {!isElectron ? (
            <p style={{ padding: 12, color: "#64748b", fontSize: 12 }}>
              File Agent działa tylko w trybie Electron.
            </p>
          ) : !rootPath ? (
            <div style={{ padding: 16, textAlign: "center" }}>
              <p style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>
                Brak otwartego folderu
              </p>
              <button onClick={openFolder} style={btnStyle("#2563eb")}>
                📂 Otwórz folder
              </button>
            </div>
          ) : (
            <FileTree
              entries={rootEntries}
              selectedPath={selectedFile?.path ?? null}
              onSelect={handleSelect}
              onExpand={handleExpand}
              expandedDirs={expandedDirs}
              childMap={childMap}
            />
          )}
        </div>

        {/* Center: Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* File tab bar */}
          {selectedFile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px", background: "#1e293b",
              borderBottom: "1px solid #334155", fontSize: 12,
            }}>
              <span>{getIcon(selectedFile)}</span>
              <span style={{ color: "#e2e8f0" }}>{selectedFile.name}</span>
              {dirty && <span style={{ color: "#f59e0b" }}>●</span>}
              <span style={{ marginLeft: "auto", color: "#64748b" }}>{language}</span>
            </div>
          )}

          {loadingFile ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>⏳ Wczytywanie…</span>
            </div>
          ) : selectedFile ? (
            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                language={language}
                value={fileContent}
                theme="vs-dark"
                onChange={(v) => { setFileContent(v ?? ""); setDirty(true); }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: "on",
                  folding: true,
                  tabSize: 2,
                  renderWhitespace: "selection",
                  cursorBlinking: "blink",
                }}
              />
            </div>
          ) : (
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 12,
            }}>
              <span style={{ fontSize: 48 }}>📁</span>
              <p style={{ color: "#475569", fontSize: 14 }}>
                {rootPath ? "Wybierz plik z drzewa po lewej" : "Otwórz folder, aby zacząć"}
              </p>
            </div>
          )}
        </div>

        {/* Right: AI Chat */}
        {aiVisible && (
          <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "6px 10px", background: "#1e293b", borderBottom: "1px solid #334155", fontSize: 12, color: "#94a3b8" }}>
              🤖 AI o pliku
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AiChat
                fileContent={fileContent}
                fileName={selectedFile?.name ?? ""}
                language={language}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 6, border: "none",
    background: bg, color: "#fff", cursor: "pointer", fontSize: 12,
    flexShrink: 0,
  };
}
