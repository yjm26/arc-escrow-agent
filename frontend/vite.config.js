import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/arc-escrow-agent/' : '/',
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
}))
