import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function crossOriginIsolation() {
  return {
    name: 'cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crossOriginIsolation()],
})
