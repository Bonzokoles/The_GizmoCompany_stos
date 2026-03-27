import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { cpSync, existsSync } from 'fs';

// Plugin: copy movies-app to dist/movies/ after build
function copyMoviesApp() {
  return {
    name: 'copy-movies-app',
    closeBundle() {
      const src = path.resolve(__dirname, 'movies-app');
      const dest = path.resolve(__dirname, 'dist', 'movies');
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
        console.log('✔ movies-app copied to dist/movies/');
      }
    },
  };
}

// Plugin: copy ai-hub to dist/ai-hub/ after build
function copyAiHub() {
  return {
    name: 'copy-ai-hub',
    closeBundle() {
      const src = path.resolve(__dirname, 'ai-hub');
      const dest = path.resolve(__dirname, 'dist', 'ai-hub');
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
        console.log('✔ ai-hub copied to dist/ai-hub/');
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMoviesApp()],
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
