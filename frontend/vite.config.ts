import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Never serve the SPA fallback (index.html) for API routes. Without this,
        // navigating to /api/calendar/*.ics in the browser returns the app HTML
        // instead of the calendar feed. (Server-side fetchers like Google's are
        // unaffected — they don't run the service worker.)
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'HerDay',
        short_name: 'HerDay',
        description: 'Calendrier de suivi du cycle pour mieux accompagner sa compagne',
        theme_color: '#e11d48',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
