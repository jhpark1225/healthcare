import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
