import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupSecurityProtection } from './utils/securityProtection';

// Initialize anti-copy, anti-right-click on images, and anti-Ctrl+U protection
if (typeof window !== 'undefined') {
  setupSecurityProtection();

  window.addEventListener('unhandledrejection', (event) => {
    // Prevent unhandled promise rejections from outputting red traces to console
    event.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

