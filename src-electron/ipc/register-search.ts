import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { SearchService, type SearchConfig } from "../services/search-service";
import { type SearchFilters } from "../services/searxng-service";
import { isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.SEARCH;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerSearch(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const searchService = container.get<SearchService>("searchService");

  ipcMain.handle(CH.WEB, async (_, query: string, filters?: SearchFilters) => {
    if (!isValidString(query))
      return { success: false, error: "Nieprawidłowe zapytanie" };
    try {
      return {
        success: true,
        data: await searchService.webSearch(query, filters),
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.DEEP, async (_, query: string, filters?: SearchFilters) => {
    if (!isValidString(query))
      return { success: false, error: "Nieprawidłowe zapytanie" };
    try {
      return {
        success: true,
        data: await searchService.deepSearch(query, filters),
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.LOCAL, async (_, query: string, libraryId?: string) => {
    if (!isValidString(query))
      return { success: false, error: "Nieprawidłowe zapytanie" };
    try {
      return {
        success: true,
        data: searchService.localSearch(query, libraryId),
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.COMPARE, async (_, query: string, libraryId?: string) => {
    if (!isValidString(query))
      return { success: false, error: "Nieprawidłowe zapytanie" };
    try {
      return {
        success: true,
        data: await searchService.compare(query, libraryId),
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  });
  ipcMain.handle(CH.IS_READY, async () => searchService.isReady());
  ipcMain.handle(CH.GET_CONFIG, async () => searchService.getConfig());
  ipcMain.handle(CH.SET_CONFIG, async (_, config: SearchConfig) => {
    if (!config || typeof config !== "object") return;
    searchService.setConfig(config);
  });
}
