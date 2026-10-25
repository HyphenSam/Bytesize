/// <reference types="vitest/config" />
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { oversized } from './scripts/pages-limit.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

// Lets the AVIF and JPEG XL encoders use threads (SharedArrayBuffer).
// Everything is same-origin, so `require-corp` costs nothing and, unlike
// `credentialless`, Safari supports it. public/_headers sets the same in
// production.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

/** Fails the build if Cloudflare would refuse a file (static assets are capped at 25 MiB each, on Workers as on Pages). */
function pagesLimit(): Plugin {
  return {
    name: 'pages-limit',
    apply: 'build',
    closeBundle() {
      const big = oversized(join(root, 'dist'))
      if (big.length) {
        throw new Error(
          `Over Cloudflare's 25 MiB asset limit: ${big.map((f) => `${f.path} (${f.size} bytes)`).join(', ')}`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bytesize',
        short_name: 'Bytesize',
        description: 'Compresses images on your device. Nothing is uploaded.',
        lang: 'en-GB',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#141416',
        theme_color: '#141416',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.jxl', '.gif', '.bmp'],
            },
          },
        ],
      },
      workbox: {
        // The app shell. The codecs' wasm (about 20 MB in all, most of it for
        // formats a visitor may never use) is cached the first time each is
        // needed instead, so it works offline from then on.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bytesize-codecs',
              // Names carry a hash, so old ones are never asked for again.
              expiration: { maxEntries: 40 },
            },
          },
        ],
      },
    }),
    pagesLimit(),
  ],
  resolve: {
    alias: { '@': join(root, 'src') },
  },
  worker: { format: 'es' },
  optimizeDeps: {
    exclude: [
      '@jsquash/avif',
      '@jsquash/jpeg',
      '@jsquash/jxl',
      '@jsquash/oxipng',
      '@jsquash/png',
      '@jsquash/resize',
      '@jsquash/webp',
    ],
  },
  server: { headers: isolation },
  preview: { headers: isolation },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
})
