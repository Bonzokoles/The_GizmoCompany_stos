import type { BizTool } from "../../shared/constants";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  _summary?: boolean;
}

export interface ToolHistoryItem {
  id: string;
  text: string;
  ts: number;
}

export type BizCategory =
  | "all"
  | "trading"
  | "analytics"
  | "accounting"
  | "crm"
  | "erp"
  | "scraping"
  | "automation"
  | "api";

export interface BizToolsTabProps {
  BIZTOOLS_CATALOG: BizTool[];
  bizSearch: string;
  setBizSearch: (value: string) => void;
  bizCategory: BizCategory;
  setBizCategory: (value: BizCategory) => void;
  BIZ_CATEGORIES: readonly BizCategory[];
  tavilyKey: string;
  setTavilyKey: (value: string) => void;
  tavilyQuery: string;
  setTavilyQuery: (value: string) => void;
  handleTavilySearch: (queryOverride?: string) => void;
  tavilyLoading: boolean;
  tavilyError: string;
  tavilyResults: TavilyResult[];
  jimboOnline: boolean;
  activeTool: string;
  toolResult: string;
  toolHistory: ToolHistoryItem[];
  toolEvents: string[];
  toolLoading: boolean;
  handleRunTool: (id: string, params?: Record<string, string>) => void;
}
