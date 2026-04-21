/**
 * Goose Changelog & Issues Tracker
 *
 * Goose zapisuje tu co zmienił i jakie błędy znalazł.
 * BuchChatWidget może czytać przez GET /agent/changelog i GET /agent/issues.
 *
 * PLIKI:
 *   JIMBO_agent_HUB/goose-changelog.json  — historia zmian
 *   JIMBO_agent_HUB/goose-issues.json     — znalezione/otwarte problemy
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CHANGELOG_PATH = path.join(ROOT, "goose-changelog.json");
const ISSUES_PATH = path.join(ROOT, "goose-issues.json");

export interface ChangeEntry {
  ts: number;
  taskId: string;
  instruction: string;
  summary: string;
  files?: string[];
}

export interface IssueEntry {
  ts: number;
  description: string;
  location?: string;
  status: "open" | "fixed";
  fixedBy?: string;
}

function readJSON<T>(filepath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(filepath: string, data: unknown): void {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

export function appendChange(entry: Omit<ChangeEntry, "ts">): void {
  const log = readJSON<ChangeEntry[]>(CHANGELOG_PATH, []);
  log.push({ ts: Date.now(), ...entry });
  writeJSON(CHANGELOG_PATH, log.slice(-200));
}

export function appendIssue(entry: Omit<IssueEntry, "ts">): void {
  const issues = readJSON<IssueEntry[]>(ISSUES_PATH, []);
  issues.push({ ts: Date.now(), ...entry });
  writeJSON(ISSUES_PATH, issues.slice(-100));
}

export function readChangelog(n = 20): ChangeEntry[] {
  return readJSON<ChangeEntry[]>(CHANGELOG_PATH, []).slice(-n).reverse();
}

export function readIssues(): IssueEntry[] {
  return readJSON<IssueEntry[]>(ISSUES_PATH, []);
}

export function markIssueFixed(index: number, fixedBy: string): void {
  const issues = readJSON<IssueEntry[]>(ISSUES_PATH, []);
  if (issues[index]) {
    issues[index].status = "fixed";
    issues[index].fixedBy = fixedBy;
    writeJSON(ISSUES_PATH, issues);
  }
}
