import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          router: ['react-router-dom'],
          i18n: ['i18next', 'react-i18next'],
          utils: ['axios', 'zustand']
        }
      }
    }
  },
  server: {
    historyApiFallback: true
  }
})
