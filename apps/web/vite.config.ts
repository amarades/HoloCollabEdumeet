import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'tailwind-merge', 'clsx'],
          'media-vendor': ['livekit-client', '@mediapipe/camera_utils', '@mediapipe/hands'],
          '3d-vendor': ['three']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api/ai': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
      },
      '/api/gestures': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8002',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
