import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import { BrowserUI } from './components/browser-core/BrowserUI';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const isElectron = typeof window !== 'undefined' && !!(window.electronAPI);

const COPILOTKIT_URL =
  (import.meta as any).env?.VITE_COPILOTKIT_URL ?? '/api/copilotkit';

export function App() {
  if (isElectron) {
    return (
      <CopilotKit runtimeUrl={COPILOTKIT_URL}>
        <BrowserUI />
      </CopilotKit>
    );
  }
  return <WebLanding />;
}
