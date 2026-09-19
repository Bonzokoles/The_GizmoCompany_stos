export type RenderActionType =
  | "screenshot"
  | "pdf"
  | "scrape"
  | "markdown"
  | "json";

export interface ScrapeAttribute {
  name: string;
  value: string;
}

export interface ScrapeItem {
  text?: string;
  html?: string;
  attributes?: ScrapeAttribute[];
}

export interface ScrapeGroup {
  selector: string;
  results: ScrapeItem[];
}

export interface RenderResultData {
  success?: boolean;
  error?: string;
  url?: string;
  size?: number;
  format?: "png" | "pdf";
  image?: string;
  data?: string;
  markdown?: string;
  selectors?: string[];
  prompt?: string;
  result?: ScrapeGroup[] | Record<string, unknown> | unknown;
}

export interface RenderTabProps {
  renderUrl: string;
  setRenderUrl: (url: string) => void;
  renderAction: RenderActionType;
  setRenderAction: (action: RenderActionType) => void;
  renderSelectors: string;
  setRenderSelectors: (selectors: string) => void;
  renderPrompt: string;
  setRenderPrompt: (prompt: string) => void;
  handleRender: () => Promise<void>;
  renderLoading: boolean;
  renderResult: RenderResultData | null;
  jimboOnline: boolean;
  jimboResponse: string;
  deployments: unknown[];
  deployLog: string;
  setDeployLog: (log: string) => void;
  handleTriggerDeploy: (project: string) => Promise<void>;
  handleAnalyzeDeployError: (log?: string) => Promise<void>;
}
