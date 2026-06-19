import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// Must match config.js: NODE_PORT || PORT || 3002 — otherwise /api proxy misses the real server.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.NODE_PORT || env.PORT || '3002';
  const apiTarget = `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [
      react(),
      sentryVitePlugin({
        org: env.VITE_SENTRY_ORG || 'signal-md',
        project: env.VITE_SENTRY_PROJECT || 'javascript-react',
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: { assets: './dist/**' },
        release: { name: env.VITE_APP_VERSION || '2.0.0' },
        // Only upload in CI/production builds
        disable: !env.SENTRY_AUTH_TOKEN,
      }),
    ],
    resolve: {
      alias: {
        '@types':      path.resolve(__dirname, 'src/types'),
        '@services':   path.resolve(__dirname, 'src/services'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@hooks':      path.resolve(__dirname, 'src/hooks'),
        '@contexts':   path.resolve(__dirname, 'src/contexts'),
        '@pages':      path.resolve(__dirname, 'src/pages'),
        '@utils':      path.resolve(__dirname, 'src/utils'),
        '@contracts':  path.resolve(__dirname, 'shared/contracts'),
      },
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api':       { target: apiTarget, changeOrigin: true },
        '/health':    { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@sentry')) {
              return 'vendor-sentry';
            }
            if (id.includes('node_modules/socket.io-client')) {
              return 'vendor-socket';
            }
          },
        },
      },
    },
  };
});
