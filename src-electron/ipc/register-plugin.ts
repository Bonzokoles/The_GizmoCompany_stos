import type { BrowserWindow } from "electron";
import { PluginIPCBridge } from "../services/plugins";
import type { ServiceContainer } from "../app/service-container";

export function registerPlugin(
  _win: BrowserWindow,
  _container: ServiceContainer,
): void {
  // bridge registers full plugin:* suite internally without duplicate handlers
  new PluginIPCBridge();
}
