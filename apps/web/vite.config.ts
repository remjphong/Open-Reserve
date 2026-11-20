import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// Proxy only the three frozen microservices. No fourth gateway process.
// Vite uses these rules for both local development and Compose preview.
const endpoints = [
  ['catalog', 'OPENRESERVE_CATALOG_ORIGIN', 'http://127.0.0.1:3001'],
  ['chain', 'OPENRESERVE_CHAIN_ORIGIN', 'http://127.0.0.1:3002'],
  ['economics', 'OPENRESERVE_ECONOMICS_ORIGIN', 'http://127.0.0.1:3003'],
] as const

function apiProxy(): Record<string, string | ProxyOptions> {
  return Object.fromEntries(endpoints.map(([name, key, fallback]) => {
    const prefix = '/api/' + name
    const target = process.env[key] || fallback
    // Prefix-boundary check prevents /api/chain-else matching /api/chain.
    return [
      '^' + prefix + '(?:/|$)',
      {
        target,
        changeOrigin: true,
        rewrite: (path: string) => path.slice(prefix.length) || '/',
      },
    ]
  }))
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy() },
  preview: { proxy: apiProxy() },
})
