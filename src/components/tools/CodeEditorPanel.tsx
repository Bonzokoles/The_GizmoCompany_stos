/**
 * CodeEditorPanel — Monaco Editor + AI Completions (JIMBO hub)
 * Etap B+C: full code editor with inline AI suggestions and AI sidebar
 */

import { useState, useCallback, useRef, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable, Position } from "monaco-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CodeEditorPanelProps {
  onClose: () => void;
}

interface FileTab {
  id: string;
  name: string;
  path?: string;
  language: string;
  content: string;
  dirty: boolean;
}

interface AiMessage {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HUB_URL = "http://localhost:4224";

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", cs: "csharp",
    cpp: "cpp", c: "c", html: "html", css: "css", scss: "scss",
    json: "json", yaml: "yaml", yml: "yaml", md: "markdown",
    sh: "shell", bash: "shell", ps1: "powershell", sql: "sql",
    toml: "ini", xml: "xml", vue: "html",
  };
  return map[ext] ?? "plaintext";
}

function newTab(name = "untitled.ts"): FileTab {
  return {
    id: `tab-${Date.now()}`,
    name,
    language: detectLanguage(name),
    content: "",
    dirty: false,
  };
}

// ─── AI Completions Provider ──────────────────────────────────────────────────

let completionDebounce: ReturnType<typeof setTimeout> | null = null;

async function fetchAiCompletion(code: string, cursorLine: string, language: string): Promise<string> {
  try {
    const prompt = `You are an expert ${language} programmer. Complete the following code snippet. Return ONLY the completion text (no explanation, no markdown, no code fences). If nothing useful to add, return empty string.\n\nCode context:\n${code.slice(-1500)}\n\nCurrent line (complete it):\n${cursorLine}`;
    const res = await fetch(`${HUB_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, stream: false, model: "claude-haiku-4-5" }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return "";
    const data = await res.json() as { message?: string };
    const text = data.message?.trim() ?? "";
    // Strip any accidental markdown code fences
    return text.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  } catch {
    return "";
  }
}

function registerCompletions(monaco: Monaco, language: string): IDisposable {
  return monaco.languages.registerInlineCompletionsProvider(language, {
    provideInlineCompletions: async (model: MonacoEditor.ITextModel, position: Position) => {
      const code = model.getValue();
      const cursorLine = model.getLineContent(position.lineNumber);

      return new Promise((resolve) => {
        if (completionDebounce) clearTimeout(completionDebounce);
        completionDebounce = setTimeout(async () => {
          const completion = await fetchAiCompletion(code, cursorLine, language);
          if (!completion) { resolve({ items: [] }); return; }
          resolve({
            items: [{
              insertText: completion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: cursorLine.length + 1,
              },
            }],
          });
        }, 800);
      });
    },
    freeInlineCompletions: () => {},
  });
}

// ─── AI Sidebar ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: "🐛", label: "Fix błąd", prompt: (code: string, sel: string) => `Fix the error or bug in this ${sel ? "selected" : ""} code:\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
  { icon: "📖", label: "Wyjaśnij", prompt: (code: string, sel: string) => `Explain step by step what this code does:\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
  { icon: "♻", label: "Refaktor", prompt: (code: string, sel: string) => `Refactor and improve this code (cleaner, more efficient, better naming):\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
  { icon: "✅", label: "Testy", prompt: (code: string, sel: string) => `Write comprehensive unit tests (vitest/jest) for this code:\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
  { icon: "📝", label: "Dokumentacja", prompt: (code: string, sel: string) => `Add JSDoc/docstring documentation to this code:\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
  { icon: "🔍", label: "Code Review", prompt: (code: string, sel: string) => `Do a thorough code review of this code. Point out issues, potential bugs, and improvements:\n\`\`\`\n${sel || code.slice(-2000)}\n\`\`\`` },
];

function AiSidebar({
  getCode,
  getSelection,
  language,
}: {
  getCode: () => string;
  getSelection: () => string;
  language: string;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "assistant", content: `🤖 AI Code Assistant gotowy.\nJęzyk: **${language}**\n\nUżyj przycisków akcji lub wpisz pytanie.` },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (userMsg: string) => {
    if (!userMsg.trim() || isStreaming) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "", loading: true },
    ]);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${HUB_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, stream: true }),
        signal: abortRef.current.signal,
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
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated, loading: false };
                return copy;
              });
            } catch { /* skip malformed SSE */ }
          }
        }
      }
      // Finalize — also handle non-streaming response
      if (!accumulated) {
        const json = await res.json().catch(() => ({ message: "Brak odpowiedzi" })) as { message?: string };
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: json.message ?? "Brak odpowiedzi" };
          return copy;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `❌ Błąd: ${String(err)}\n\nSprawdź czy JIMBO Hub działa na localhost:4224` };
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming]);

  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[0]) => {
    const code = getCode();
    const sel = getSelection();
    sendMessage(action.prompt(code, sel));
  }, [getCode, getSelection, sendMessage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "1px solid #1e293b", background: "#0a0f1a", width: "300px", flexShrink: 0 }}>
      {/* Quick actions */}
      <div style={{ padding: "8px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
        <div style={{ fontSize: "10px", color: "#475569", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Szybkie akcje</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => handleQuickAction(a)}
              disabled={isStreaming}
              style={{ background: "#1e293b", border: "none", color: "#cbd5e1", padding: "5px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "11px", textAlign: "left", opacity: isStreaming ? 0.5 : 1 }}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px", fontSize: "12px", fontFamily: "system-ui, sans-serif" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>
              {msg.role === "user" ? "👤 Ty" : "🤖 AI"}
            </div>
            <div style={{
              background: msg.role === "user" ? "#1e293b" : "#0f172a",
              border: `1px solid ${msg.role === "user" ? "#334155" : "#1e293b"}`,
              borderRadius: "6px",
              padding: "8px",
              color: "#e2e8f0",
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              fontSize: "11.5px",
            }}>
              {msg.loading ? <span style={{ color: "#7c3aed" }}>⬤ generuję...</span> : msg.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "8px", flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          disabled={isStreaming}
          placeholder="Zapytaj o kod... (Enter = wyślij)"
          rows={3}
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "6px", padding: "6px 8px", fontSize: "11.5px", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}
        />
        <div style={{ display: "flex", gap: "6px", marginTop: "5px" }}>
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            style={{ flex: 1, background: "#7c3aed", border: "none", color: "#fff", borderRadius: "5px", padding: "5px", cursor: "pointer", fontSize: "11px", opacity: isStreaming || !input.trim() ? 0.5 : 1 }}
          >
            {isStreaming ? "⬤ generuję..." : "▶ Wyślij"}
          </button>
          {isStreaming && (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{ background: "#dc2626", border: "none", color: "#fff", borderRadius: "5px", padding: "5px 8px", cursor: "pointer", fontSize: "11px" }}
            >
              ⏹
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CodeEditorPanel({ onClose }: CodeEditorPanelProps) {
  const [tabs, setTabs] = useState<FileTab[]>([newTab("untitled.ts")]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [showAi, setShowAi] = useState(true);
  const [status, setStatus] = useState("Gotowy");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionDisposableRef = useRef<IDisposable | null>(null);

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // Register AI completions when language or monaco changes
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    completionDisposableRef.current?.dispose();
    completionDisposableRef.current = registerCompletions(monaco, activeTab.language);
    return () => { completionDisposableRef.current?.dispose(); };
  }, [activeTab.language]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // Ctrl+S → save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Register completions
    completionDisposableRef.current = registerCompletions(monaco, activeTab.language);

    setStatus("Monaco gotowy — AI completions aktywne");
  }, []);

  const handleContentChange = useCallback((value: string | undefined) => {
    const content = value ?? "";
    setTabs((prev) =>
      prev.map((t) => t.id === activeId ? { ...t, content, dirty: true } : t),
    );
  }, [activeId]);

  // ── File operations ──────────────────────────────────────────

  const handleOpen = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) { setStatus("Tylko Electron — brak dialog API"); return; }
    try {
      // Use dialog API
      const result = await (api as { dialog?: { openFiles?: (opts: unknown) => Promise<{ canceled: boolean; filePaths: string[] }> } })
        .dialog?.openFiles?.({ filters: [{ name: "Code", extensions: ["ts","tsx","js","jsx","py","rs","go","md","json","yaml","css","html"] }, { name: "All", extensions: ["*"] }] });
      if (!result || result.canceled || !result.filePaths.length) return;

      const filePath = result.filePaths[0];
      const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
      const readResult = await (api as { dialog?: { readFiles?: (paths: string[]) => Promise<{ contents: Record<string, string> }> } })
        .dialog?.readFiles?.([filePath]);
      const content = readResult?.contents?.[filePath] ?? "";

      const tab: FileTab = {
        id: `tab-${Date.now()}`,
        name: fileName,
        path: filePath,
        language: detectLanguage(fileName),
        content,
        dirty: false,
      };
      setTabs((prev) => [...prev, tab]);
      setActiveId(tab.id);
      setStatus(`Otwarto: ${fileName}`);
    } catch (err) {
      setStatus(`Błąd otwarcia: ${String(err)}`);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab) return;
    if (!tab.path) {
      setStatus("Użyj Ctrl+Shift+S dla 'Zapisz jako'");
      return;
    }
    try {
      setStatus(`Zapisuję ${tab.name}...`);
      // Write via Electron fs — use JIMbo_kit if available
      const res = await fetch("http://localhost:4111/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: tab.path, content: tab.content }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        setTabs((prev) => prev.map((t) => t.id === activeId ? { ...t, dirty: false } : t));
        setStatus(`Zapisano: ${tab.name}`);
      } else {
        setStatus(`Błąd zapisu: HTTP ${res.status}`);
      }
    } catch (err) {
      setStatus(`Błąd zapisu: ${String(err)}`);
    }
  }, [tabs, activeId]);

  const handleNewTab = useCallback(() => {
    const tab = newTab("untitled.ts");
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) return [newTab()];
      return next;
    });
    if (activeId === id) {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs[idx + 1] ?? tabs[idx - 1];
      if (next) setActiveId(next.id);
    }
  }, [activeId, tabs]);

  const getCode = useCallback(() => editorRef.current?.getValue() ?? "", []);
  const getSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return "";
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return "";
    return editor.getModel()?.getValueInRange(selection) ?? "";
  }, []);

  // ── Rename tab on double-click ───────────────────────────────

  const handleRenameTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const newName = window.prompt("Zmień nazwę pliku:", tab.name);
    if (newName && newName.trim()) {
      setTabs((prev) => prev.map((t) =>
        t.id === id ? { ...t, name: newName.trim(), language: detectLanguage(newName.trim()) } : t,
      ));
    }
  }, [tabs]);

  return (
    <div style={{
      position: "fixed",
      top: "40px",
      left: "50%",
      transform: "translateX(-50%)",
      width: showAi ? "min(1200px, 95vw)" : "min(900px, 95vw)",
      height: "calc(100vh - 90px)",
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "10px",
      display: "flex",
      flexDirection: "column",
      zIndex: 1000,
      boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
      transition: "width 0.2s",
    }}>
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderBottom: "1px solid #1e293b", flexShrink: 0, background: "#0a0f1a", borderRadius: "10px 10px 0 0" }}>
        <span style={{ fontSize: "14px", marginRight: "4px" }}>💻</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0", marginRight: "8px" }}>Code Editor</span>
        <button onClick={handleOpen} style={btnStyle} title="Otwórz plik (Ctrl+O)">📁 Otwórz</button>
        <button onClick={handleSave} style={btnStyle} title="Zapisz (Ctrl+S)">💾 Zapisz</button>
        <button onClick={handleNewTab} style={btnStyle} title="Nowy plik">📄 Nowy</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "11px", color: "#475569", background: "#1e293b", padding: "2px 8px", borderRadius: "4px" }}>
          {activeTab.language}
        </span>
        <button
          onClick={() => setShowAi((v) => !v)}
          style={{ ...btnStyle, background: showAi ? "#7c3aed" : "#1e293b", color: "#fff" }}
          title="Pokaż/ukryj AI sidebar"
        >
          🤖 AI {showAi ? "▶" : "◀"}
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "18px", padding: "0 4px" }}>×</button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", alignItems: "center", background: "#0a0f1a", borderBottom: "1px solid #1e293b", overflow: "auto", flexShrink: 0 }}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            onDoubleClick={() => handleRenameTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "5px 12px", cursor: "pointer", userSelect: "none",
              background: tab.id === activeId ? "#0f172a" : "transparent",
              borderBottom: tab.id === activeId ? "2px solid #7c3aed" : "2px solid transparent",
              color: tab.id === activeId ? "#e2e8f0" : "#64748b",
              fontSize: "12px", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <span>{tab.name}</span>
            {tab.dirty && <span style={{ color: "#f59e0b", fontSize: "8px" }}>●</span>}
            <span
              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
              style={{ color: "#475569", marginLeft: "2px", fontSize: "12px", lineHeight: 1 }}
            >×</span>
          </div>
        ))}
        <button onClick={handleNewTab} style={{ padding: "5px 10px", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "16px" }} title="Nowy tab">+</button>
      </div>

      {/* ── Editor + AI sidebar ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Monaco */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Editor
            language={activeTab.language}
            value={activeTab.content}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
              fontLigatures: true,
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              suggestOnTriggerCharacters: true,
              inlineSuggest: { enabled: true, showToolbar: "onHover" },
              quickSuggestions: { other: true, comments: false, strings: false },
              parameterHints: { enabled: true },
              folding: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              renderWhitespace: "selection",
              cursorSmoothCaretAnimation: "on",
              smoothScrolling: true,
            }}
          />
        </div>

        {/* AI Sidebar */}
        {showAi && (
          <AiSidebar
            getCode={getCode}
            getSelection={getSelection}
            language={activeTab.language}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "3px 12px", fontSize: "10px", color: "#475569", display: "flex", gap: "12px", flexShrink: 0, background: "#0a0f1a", borderRadius: "0 0 10px 10px" }}>
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span>{activeTab.language}</span>
        <span style={{ color: "#4ade80" }}>● Monaco v0.55</span>
        <span style={{ color: "#7c3aed" }}>AI: JIMBO:4224</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#94a3b8" }}>{status}</span>
        <span>Ctrl+S zapisz • Tab = AI accept</span>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "none",
  color: "#cbd5e1",
  padding: "4px 10px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "11.5px",
};
