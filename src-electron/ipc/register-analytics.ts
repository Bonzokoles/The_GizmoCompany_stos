import type { BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";

/**
 * UmamiService IPC jest już rejestrowany w ServiceContainer.init()
 * przez umamiService.registerIPC() — nie tworzymy drugiej instancji.
 * Ten plik jest zachowany dla spójności struktury rejestrów.
 */
export function registerAnalytics(
  _win: BrowserWindow,
  _container: ServiceContainer,
): void {
  // no-op: UmamiService.registerIPC() called in ServiceContainer.init()
}
