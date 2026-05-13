import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/arc-escrow-agent/' : '/',
  server: {
    historyApiFallback: true,
  },
  preview: {
    historyApiFallback: true,
  },
}))
