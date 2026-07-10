import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  build: {
    // Use esbuild for minification (default, fast) — no terser dep needed
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cacheable chunks.
        // Each chunk is independently cached by the browser — changing app code
        // won't bust the framer-motion or recharts cache.
        manualChunks(id) {
          if (id.includes('framer-motion')) return 'framer-motion';
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'charts';
          if (id.includes('react-router') || id.includes('react-router-dom')) return 'router';
          if (id.includes('axios')) return 'axios';
          if (id.includes('lucide-react')) return 'lucide';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});

