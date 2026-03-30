import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import { BrowserUI } from './components/browser-core/BrowserUI';

export function ElectronApp() {
  return (
    <CopilotKit runtimeUrl="http://127.0.0.1:4111/api/copilotkit" showDevConsole={false}>
      <BrowserUI />
    </CopilotKit>
  );
}
