import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { BrowserUI } from './components/browser-core/BrowserUI';

export function ElectronApp() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <BrowserUI />
      <CopilotSidebar
        defaultOpen={false}
        labels={{ title: 'ZENO Asystent AI', initial: 'Cześć! Jak mogę pomóc?' }}
      />
    </CopilotKit>
  );
}
