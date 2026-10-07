import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Only register Service Worker when running as a web PWA in standalone browsers.
// Inside native Capacitor Android WebViews or preview iframes, service workers cause blank screens.
const isCapacitorNative = typeof window !== 'undefined' && 
  (window.location.protocol === 'capacitor:' || 
   window.location.protocol === 'file:' || 
   !!(window as any).Capacitor?.isNativePlatform?.() ||
   (window as any).Capacitor?.getPlatform?.() === 'android');

const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

if (!isCapacitorNative && !isInIframe && 'serviceWorker' in navigator && typeof window !== 'undefined') {
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
} else if ((isCapacitorNative || isInIframe) && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // If running in Capacitor or inside the preview iframe, unregister any stale service workers
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

