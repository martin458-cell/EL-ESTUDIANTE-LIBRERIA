import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and suppress benign WebSocket/Vite HMR connection errors in the iframe environment
if (typeof window !== 'undefined') {
  const isWebsocketError = (errStr: string) => {
    return (
      errStr.includes('WebSocket') ||
      errStr.includes('websocket') ||
      errStr.includes('vite') ||
      errStr.includes('closed without opened') ||
      errStr.includes('ws://') ||
      errStr.includes('wss://')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (isWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
      console.debug('Silenced benign Vite/WebSocket HMR promise rejection:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isWebsocketError(msg)) {
      event.preventDefault();
      event.stopPropagation();
      console.debug('Silenced benign Vite/WebSocket HMR error:', msg);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

