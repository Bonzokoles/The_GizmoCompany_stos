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
      // Stubuj CopilotKit tylko dla builda webowego (CF Pages).
      // Electron (npm run dev) używa prawdziwych paczek — stąd guard na VITE_BUILD_TARGET.
      ...(process.env.VITE_BUILD_TARGET === 'web' ? {
        '@copilotkit/react-ui/styles.css': path.resolve(__dirname, 'src/vendor/copilotkit-react-ui-stub.css'),
        '@copilotkit/react-core': path.resolve(__dirname, 'src/vendor/copilotkit-react-core-stub.tsx'),
        '@copilotkit/react-ui': path.resolve(__dirname, 'src/vendor/copilotkit-react-ui-stub.tsx'),
      } : {}),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['use-sync-external-store/shim/index.js'],
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

          // use-sync-external-store MUSI być w tym samym chunku co React —
          // jej CJS shim wykonuje React.useState bezpośrednio i crasha gdy
          // React chunk nie jest jeszcze załadowany.
          // Zustand jest tutaj, bo importuje bezpośrednio react + use-sync-external-store,
          // co tworzy cykl vendor-zustand <-> vendor-react — wspólny chunk eliminuje cykl.
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/use-sync-external-store/') ||
            id.includes('/zustand/')
          ) {
            return 'vendor-react';
          }

          if (id.includes('/page-agent/')) {
            return 'vendor-page-agent';
          }

          if (
            id.includes('/@copilotkit/') ||
            id.includes('/@copilotkitnext/') ||
            id.includes('/@ag-ui/')
          ) {
            return 'vendor-copilotkit';
          }

          // Group all @radix-ui/* together — per-package splitting breaks their
          // internal initialization order and causes "Cannot access 'X' before initialization"
          if (id.includes('/@radix-ui/')) {
            return 'vendor-radix-ui';
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
