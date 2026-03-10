import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defaultBackendUrl =
    mode === 'production'
      ? 'https://clownfish-app-ipxaa.ondigitalocean.app'
      : 'http://127.0.0.1:8000';
  const backendUrl = env.VITE_BACKEND_URL || defaultBackendUrl;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
    },
    server: {
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        }
      }
    }
  };
});
