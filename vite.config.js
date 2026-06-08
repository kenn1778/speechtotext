import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['jspdf'],
          'vendor-animation': ['framer-motion'],
        }
      }
    },
    chunkSizeWarningLimit: 400
  }
})
