import { Suspense, lazy, useEffect } from 'react';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const ElectronApp = lazy(() => import('./ElectronApp').then((m) => ({ default: m.ElectronApp })));

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

  if (!isElectron) {
    return <WebLanding />;
  }

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Ładowanie trybu Electron...</div>}>
      <ElectronApp />
    </Suspense>
  );
}
