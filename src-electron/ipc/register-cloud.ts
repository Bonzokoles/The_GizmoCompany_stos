import type { BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";

/**
 * TunnelUIBridge tworzy singleton na poziomie modułu i rejestruje IPC
 * w konstruktorze. Import singletona wystarczy — nie tworzymy drugiej instancji.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { tunnelBridge } from "../services/cloud/tunnel-ui-bridge";

export function registerCloud(
  _win: BrowserWindow,
  _container: ServiceContainer,
): void {
  // no-op: tunnelBridge singleton registers tunnel:* IPC handlers on module load
  void tunnelBridge; // ensure module is evaluated / tree-shake guard
}
