import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Automatically handle Vite dynamic import stale-chunk errors after new deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const reloadKey = 'startupz_last_preload_reload';
  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  if (now - lastReload > 10000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
