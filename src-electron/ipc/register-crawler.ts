import { ipcMain, type BrowserWindow } from "electron";
import type { ServiceContainer } from "../app/service-container";
import { CrawlerService, type CrawlConfig } from "../services/crawler-service";
import { isSafeUrl, isValidString } from "../utils/validate-url";
import { IPC } from "../../src/shared/ipc/channels";

const CH = IPC.CRAWLER;

export function registerCrawler(
  _win: BrowserWindow,
  container: ServiceContainer,
): void {
  const crawlerService = container.get<CrawlerService>("crawlerService");

  ipcMain.handle(CH.START, async (_, config: CrawlConfig) => {
    if (!config || !Array.isArray(config.startUrls)) return null;
    for (const u of config.startUrls) {
      if (!isValidString(u) || !isSafeUrl(u)) return null;
    }
    return crawlerService.startCrawl(config);
  });
  ipcMain.handle(CH.CANCEL, async (_, crawlId: string) => {
    if (!isValidString(crawlId)) return false;
    return crawlerService.cancelCrawl(crawlId);
  });
  ipcMain.handle(CH.GET, async (_, crawlId: string) => {
    if (!isValidString(crawlId)) return null;
    return crawlerService.getCrawl(crawlId);
  });
  ipcMain.handle(CH.LIST, async () => crawlerService.listCrawls());
  ipcMain.handle(
    CH.EXPORT,
    async (_, crawlId: string, format?: "json" | "csv") => {
      if (!isValidString(crawlId)) return null;
      return crawlerService.exportCrawlData(crawlId, format);
    },
  );
}
