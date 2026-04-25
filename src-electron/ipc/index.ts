import type { BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { registerBrowser } from "./register-browser";
import { registerAi } from "./register-ai";
import { registerNetwork } from "./register-network";
import { registerWorkflow } from "./register-workflow";
import { registerCrawler } from "./register-crawler";
import { registerTerminal } from "./register-terminal";
import { registerMcp } from "./register-mcp";
import { registerSearch } from "./register-search";
import { registerHub } from "./register-hub";
import { registerWindow } from "./register-window";
import { registerDialog } from "./register-dialog";
import { registerPlugin } from "./register-plugin";
import { registerPty } from "./register-pty";
import { registerFile } from "./register-file";
import { registerSystem } from "./register-system";
import { registerAnalytics } from "./register-analytics";
import { registerCloud } from "./register-cloud";
import { registerClipboardIpc } from "./register-clipboard";
import type { PiAgentService } from "../services/ai/pi-agent-service";

export function registerAllIpc(
  win: BrowserWindow,
  container: ServiceContainer,
): void {
  registerBrowser(win, container);
  registerAi(win, container);
  registerNetwork(win, container);
  registerWorkflow(win, container);
  registerCrawler(win, container);
  registerTerminal(win, container);
  registerMcp(win, container);
  registerSearch(win, container);
  registerHub(win, container);
  registerWindow(win, container);
  registerDialog(win, container);
  registerPlugin(win, container);
  registerPty(win, container);
  registerFile(win);
  registerSystem(win, container);
  registerAnalytics(win, container);
  registerCloud(win, container);
  registerClipboardIpc(win);

  const piAgentService = container.get<PiAgentService>("piAgentService");
  piAgentService.registerIpcHandlers();
}
