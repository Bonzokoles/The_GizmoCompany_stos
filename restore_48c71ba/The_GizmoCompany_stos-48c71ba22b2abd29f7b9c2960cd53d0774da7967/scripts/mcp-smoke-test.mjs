import { _electron as electron } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  let app;
  try {
    app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        ELECTRON_IS_DEV: '1',
      },
      timeout: 60_000,
    });

    const first = await app.firstWindow();
    await first.waitForLoadState('domcontentloaded');

    let page = first;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const pages = app.windows();
      for (const p of pages) {
        try {
          const hasApi = await p.evaluate(() => Boolean(window?.electronAPI?.mcp));
          if (hasApi) {
            page = p;
            break;
          }
        } catch {
          // ignore transient evaluation errors while window bootstraps
        }
      }

      const ready = await page
        .evaluate(() => Boolean(window?.electronAPI?.mcp))
        .catch(() => false);
      if (ready) break;

      await sleep(500);
    }

    const apiReady = await page
      .evaluate(() => Boolean(window?.electronAPI?.mcp))
      .catch(() => false);
    if (!apiReady) {
      const urls = app.windows().map((p) => p.url());
      throw new Error(`Brak window.electronAPI.mcp w oknach Electron. URLs: ${JSON.stringify(urls)}`);
    }

    const listTools = await page.evaluate(async () => {
      return await window.electronAPI.mcp.listTools();
    });

    const tools = Array.isArray(listTools) ? listTools : [];
    const hasExecute = tools.includes('execute_script');
    const hasExtract = tools.includes('extract_text');

    if (!hasExecute || !hasExtract) {
      throw new Error(
        `Brak wymaganych narzędzi MCP. execute_script=${hasExecute}, extract_text=${hasExtract}`,
      );
    }

    await page.evaluate(async () => {
      await window.electronAPI.mcp.executeTool('browser_new_tab', {
        url: 'https://example.com',
      });
    });

    await sleep(4000);

    const tabsRes = await page.evaluate(async () => {
      return await window.electronAPI.mcp.executeTool('browser_get_tabs', {});
    });

    const execRes = await page.evaluate(async () => {
      return await window.electronAPI.mcp.executeTool('execute_script', {
        script: 'window.location.href',
      });
    });

    const textRes = await page.evaluate(async () => {
      return await window.electronAPI.mcp.executeTool('extract_text', {
        selector: 'body',
        maxLength: 200,
      });
    });

    const execOk =
      typeof execRes === 'object' &&
      execRes &&
      'success' in execRes &&
      execRes.success === true &&
      typeof execRes?.data?.result === 'string';

    const textOk =
      typeof textRes === 'object' &&
      textRes &&
      'success' in textRes &&
      textRes.success === true &&
      typeof textRes?.data?.text === 'string';

    if (!execOk) {
      throw new Error(`execute_script nie zwrócił poprawnej odpowiedzi. Wynik: ${JSON.stringify(execRes)}`);
    }

    if (!textOk) {
      throw new Error(`extract_text nie zwrócił poprawnej odpowiedzi. Wynik: ${JSON.stringify(textRes)}`);
    }

    // eslint-disable-next-line no-console
    console.log('✅ MCP smoke test OK');
    // eslint-disable-next-line no-console
    console.log('browser_get_tabs:', JSON.stringify(tabsRes));
    // eslint-disable-next-line no-console
    console.log('execute_script:', JSON.stringify(execRes));
    // eslint-disable-next-line no-console
    console.log('extract_text:', JSON.stringify(textRes));
  } finally {
    if (app) {
      await app.close();
    }
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('❌ MCP smoke test failed:', err?.message || err);
  process.exit(1);
});
