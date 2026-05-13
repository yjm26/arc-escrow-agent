import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/arc-escrow-agent/',
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
})
