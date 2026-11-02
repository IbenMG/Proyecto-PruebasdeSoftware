/* global process */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const isCI = process.env.CI === 'true' || process.env.CI === '1'
const frontendPort = isCI ? 5173 : 5174
const apiUrl = process.env.VITE_API_URL || (
  isCI ? 'http://localhost:8000/api' : 'http://localhost:8001/api'
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
  },
  server: {
    host: '127.0.0.1',
    port: frontendPort,
    strictPort: true,
  },
})
