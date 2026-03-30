import { Suspense, lazy } from 'react';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const ElectronApp = lazy(() => import('./ElectronApp').then((m) => ({ default: m.ElectronApp })));

const isElectron = typeof window !== 'undefined' && !!(window.electronAPI);

export function App() {

  if (!isElectron) {
    return <WebLanding />;
  }

  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Ładowanie trybu Electron...</div>}>
      <ElectronApp />
    </Suspense>
  );
}
