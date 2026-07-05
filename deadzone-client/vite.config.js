import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '.vite-cache',
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/game': {
        target: 'ws://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
