import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// Plugin: force lightweight Shiki runtime only for streamdown code blocks
function patchStreamdownShiki() {
  return {
    name: 'patch-streamdown-shiki',
    enforce: 'pre' as const,
    resolveId(source: string, importer?: string) {
      const normalizedImporter = importer?.replace(/\\/g, '/');
      if (
        source === 'shiki' &&
        normalizedImporter?.includes('/node_modules/streamdown/dist/code-block-')
      ) {
        return path.resolve(__dirname, 'src/vendor/shiki-streamdown-lite.ts');
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), patchStreamdownShiki()],
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
    // Największe chunky (np. mermaid/shiki) są celowo wydzielone do osobnych plików vendor.
    // Podnosimy próg ostrzeżenia, żeby nie spamować builda fałszywym alarmem >500kB.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }

          if (id.includes('/page-agent/')) {
            return 'vendor-page-agent';
          }

          if (id.includes('/mermaid/')) {
            return 'vendor-mermaid';
          }

          if (id.includes('/cytoscape')) {
            return 'vendor-cytoscape';
          }

          // Fallback: split per npm package to avoid one giant vendor-misc chunk
          const normalized = id.replace(/\\/g, '/');
          const afterNodeModules = normalized.split('node_modules/')[1];
          if (!afterNodeModules) return 'vendor-misc';

          const parts = afterNodeModules.split('/');
          const packageName = parts[0].startsWith('@')
            ? `${parts[0]}-${parts[1] ?? 'pkg'}`
            : parts[0];

          return `vendor-${packageName.replace('@', '').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        },
      },
    },
  },
});
