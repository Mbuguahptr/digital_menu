import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  base: '/static/',  // ✅ Serve from Django staticfiles with assets folder
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
