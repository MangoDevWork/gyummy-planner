import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Cache-busting & PWA auto-updater: Check app build version and clear old service workers/caches
const CURRENT_BUILD_VERSION = '2026.08.30.v7-bilingual-recipes';

try {
  const lastVersion = localStorage.getItem('gyummy_app_build_version');
  if (lastVersion && lastVersion !== CURRENT_BUILD_VERSION) {
    localStorage.setItem('gyummy_app_build_version', CURRENT_BUILD_VERSION);
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
    }
    // Perform clean reload if outdated cached bundle detected
    if (window.location.search.indexOf('v=') === -1) {
      window.location.replace(window.location.pathname + '?v=' + Date.now());
    }
  } else if (!lastVersion) {
    localStorage.setItem('gyummy_app_build_version', CURRENT_BUILD_VERSION);
  }
} catch {
  // Ignore in restricted environments
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
