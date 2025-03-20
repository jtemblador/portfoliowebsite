import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Changed from './' to '/' for proper custom domain deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Added rollupOptions to ensure the manifest file is correctly processed
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  publicDir: 'public', // Keeping your publicDir setting
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@assets': resolve(__dirname, './src/assets')
    }
  },

  server: {
    host: '0.0.0.0', // Keeping your server settings
    port: 5174,
  },
})
