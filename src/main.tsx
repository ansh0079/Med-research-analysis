import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { registerAnalyticsInitializer } from './services/consent';
import { initLogRocket } from './services/logrocket';

// Session-replay analytics — only enabled once the user accepts the cookie consent banner.
registerAnalyticsInitializer(initLogRocket);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Ensure there is a <div id="root"></div> in your HTML.');
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
