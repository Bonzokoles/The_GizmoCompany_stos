import { BrowserUI } from './components/BrowserUI';
import { WebLanding } from './components/WebLanding';
import './styles/web-landing.css';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export function App() {
  if (isElectron) {
    return <BrowserUI />;
  }
  return <WebLanding />;
}
