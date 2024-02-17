import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/wiki-game/',
  server: { 
    port: 3000, 
    watch: {
      usePolling: true,
    },
    host: true, 
    hmr: { 
      host: 'localhost', 
    }, 
  },
})
