import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/jspdf')) return 'vendor-pdf'
          if (id.includes('node_modules/framer-motion')) return 'vendor-animation'
          if (id.includes('node_modules/aws-amplify') || id.includes('node_modules/@aws-amplify')) return 'vendor-amplify'
        },
      }
    },
    chunkSizeWarningLimit: 600
  }
})
