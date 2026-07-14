import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Nunito (prd-bubble-font-reactions US-001) — bundled woff2,
// no CDN request, precached by the PWA's existing *.woff2 glob.
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
