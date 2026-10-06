import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Only register Service Worker when running as a web PWA in standard browsers.
// Inside native Capacitor Android WebViews, service workers intercepting file:// or capacitor:// schemes cause blank screens.
const isCapacitorNative = typeof window !== 'undefined' && 
  (window.location.protocol === 'capacitor:' || 
   window.location.protocol === 'file:' || 
   !!(window as any).Capacitor?.isNativePlatform?.());

if (!isCapacitorNative && 'serviceWorker' in navigator && typeof window !== 'undefined') {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      try {
        registerSW({ immediate: true });
      } catch (e) {
        console.warn("Service worker registration skipped:", e);
      }
    })
    .catch((err) => {
      console.warn("PWA module load deferred/skipped:", err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
