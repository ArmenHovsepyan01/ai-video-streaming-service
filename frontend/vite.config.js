import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
    allowedHosts: ["4e4f14605db68398-217-113-20-139.serveousercontent.com"]
  },
})

