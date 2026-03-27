import { useEffect } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { BrowserUI } from './components/browser-core/BrowserUI';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const isElectron = typeof window !== 'undefined' && !!(window.electronAPI);

export function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('copilot') !== 'open') return;
    const open = () => {
      const button = document.querySelector<HTMLButtonElement>('.copilotKitButton');
      if (!button) return false;
      button.click();
      return true;
    };
    if (open()) return;
    const timer = window.setTimeout(() => { open(); }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {isElectron ? <BrowserUI /> : <WebLanding />}
      <CopilotSidebar
        defaultOpen={false}
        labels={{ title: 'ZENO Asystent AI', initial: 'Cześć! Jak mogę pomóc?' }}
      />
    </CopilotKit>
  );
}
