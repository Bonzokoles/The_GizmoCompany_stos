/**
 * monaco-setup.ts — Configures @monaco-editor/react to use the LOCAL
 * monaco-editor package instead of CDN (required for Electron CSP).
 *
 * Import this module ONCE before any <Editor> renders, e.g. at the top of
 * CodeEditorPanel.tsx and FileAgentPanel.tsx (side-effect import).
 */

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Tell Monaco how to spawn language server workers from local bundles.
// Must be set on `self` (= `window` in the renderer) BEFORE any editor mounts.
(self as Window & typeof globalThis & { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string): Worker {
    if (label === "json") return new jsonWorker();
    if (["css", "scss", "less"].includes(label)) return new cssWorker();
    if (["html", "handlebars", "razor"].includes(label)) return new htmlWorker();
    if (["typescript", "javascript"].includes(label)) return new tsWorker();
    return new editorWorker();
  },
};

// Point the @monaco-editor/react loader at the local monaco object —
// this skips the CDN fetch entirely.
loader.config({ monaco });
