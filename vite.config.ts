import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE is set by the GitHub Pages workflow to "/<repo-name>/".
const base = process.env.BASE ?? '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/main.tsx (with update checks)
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Práctica — Spanish Practice',
        short_name: 'Práctica',
        description: 'Latin American Spanish verb practice',
        lang: 'es-419',
        theme_color: '#0f766e',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'], cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true },
    }),
  ],
  test: { environment: 'node' },
});
