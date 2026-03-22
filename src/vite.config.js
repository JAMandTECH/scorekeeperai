import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from '@base44/vite-plugin'

// Ensure a single copy of React and router at runtime to avoid invalid hook call
export default defineConfig({
  plugins: [react(), base44()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
  }
})