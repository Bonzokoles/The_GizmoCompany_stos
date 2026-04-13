export type TabId =
  | "overview"
  | "workers"
  | "content"
  | "analytics"
  | "pipelines"
  | "crawlers"
  | "storage"
  | "databases"
  | "images"
  | "moa"
  | "render"
  | "queues"
  | "aihub"
  | "assistant"
  | "biztools"
  | "workflows"
  | "mediahub";
export type Status = "online" | "offline" | "checking" | "unknown";
export type AnalyticsSource = "local" | "mybonzo";

export interface SiteStatus {
  name: string;
  status: Status;
  url: string;
}
export interface ApiStatus {
  name: string;
  endpoint: string;
  status: Status;
}
export interface WorkerInfo {
  id: string;
  name: string;
  category: string;
  route?: string;
  description: string;
  status?: Status;
  latency?: number;
}
export interface BucketInfo {
  name: string;
  description: string;
  category: string;
}
export interface DbInfo {
  id: string;
  name: string;
  description: string;
  project: string;
}
