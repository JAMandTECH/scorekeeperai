import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'react-router-dom', 'onnxruntime-web', '@imgly/background-removal'],
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: { '@': '/src' }
  }
})
