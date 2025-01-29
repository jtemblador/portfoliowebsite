import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'

  },

  publicDir: 'public',
  resolve: {
    alias: {
      '@': '/src',
      '@assets': '/src/assets'
    }
  },

  server: {
    host: '0.0.0.0', // Allow connections from any device on the local network
    port: 5174, // Optional: Make sure this matches the port you're using
  },
})
