import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { BrowserUI } from './components/browser-core/BrowserUI';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const isElectron = typeof window !== 'undefined' && !!(window.electronAPI);

export function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {isElectron ? (
        <BrowserUI />
      ) : (
        <WebLanding />
      )}
      <CopilotSidebar
        defaultOpen={false}
        labels={{
          title: 'ZENO Asystent AI',
          initial: 'Cześć! Jak mogę pomóc?',
        }}
      />
    </CopilotKit>
  );
}
