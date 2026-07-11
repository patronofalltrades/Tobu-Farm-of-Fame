import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'models/*.glb', 'audio/*.wav'],
      manifest: {
        name: 'Tobu Wall of Fame',
        short_name: 'Tobu Farm',
        description: 'IESE MBA 2027 Barcelona — living bull farm of Tobu winners',
        theme_color: '#D50032',
        background_color: '#87CEEB',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,wav,woff2}'],
      },
    }),
  ],
});
