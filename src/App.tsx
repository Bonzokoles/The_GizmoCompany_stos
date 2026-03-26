import { BrowserUI } from './components/browser-core/BrowserUI';
import { WebLanding } from './components/landing/WebLanding';
import './styles/web-landing.css';

const isElectron = typeof window !== 'undefined' && !!(window.electronAPI);

export function App() {
  if (isElectron) {
    return <BrowserUI />;
  }
  return <WebLanding />;
}
