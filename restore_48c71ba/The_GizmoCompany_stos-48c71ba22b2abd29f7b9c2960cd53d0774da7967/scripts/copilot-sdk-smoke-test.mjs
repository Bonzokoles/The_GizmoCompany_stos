import { CopilotClient, approveAll } from '@github/copilot-sdk';
import path from 'node:path';
import process from 'node:process';

async function run() {
  const workspaceRoot = process.cwd();
  const configDir = path.join(workspaceRoot, '.workspace_meta', 'copilot');
  const skillDir = path.join(workspaceRoot, '.github', 'skills');
  const cliPath = process.env.COPILOT_CLI_PATH || 'copilot';

  const client = new CopilotClient({
    cliPath,
    logLevel: 'info',
  });

  try {
    await client.start();

    const status = await client.getStatus();
    const models = await client.listModels();

    const preferredModel = models.find((model) => model.id === 'gpt-5')?.id || models[0]?.id || 'gpt-5';

    const session = await client.createSession({
      clientName: 'zeno-browser-smoke-test',
      model: preferredModel,
      configDir,
      workingDirectory: workspaceRoot,
      skillDirectories: [skillDir],
      onPermissionRequest: approveAll,
    });

    try {
      const result = await session.sendAndWait(
        {
          prompt: 'Odpowiedz jednym zdaniem: Copilot SDK smoke test działa.',
        },
        120000,
      );

      console.log('CLI status:', JSON.stringify(status, null, 2));
      console.log('Model:', preferredModel);
      console.log('Session:', session.sessionId);
      console.log('Response:', result?.data?.content || '<brak odpowiedzi>');
    } finally {
      await session.disconnect();
    }
  } finally {
    await client.stop();
  }
}

run().catch((error) => {
  console.error('Copilot SDK smoke test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
