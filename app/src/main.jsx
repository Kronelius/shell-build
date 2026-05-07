import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register the PWA service worker once on boot. Gated on browser support so
// dev environments that don't ship a service worker (e.g., older browsers)
// silently no-op rather than throwing. The registration is fire-and-forget;
// subscription/permission flows happen later from Account → Notifications.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* registration failure is non-fatal — push just won't work */
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
