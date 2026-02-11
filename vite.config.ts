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
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            'zustand-vendor': ['zustand'],
            'ai-module': [
              './src/modules/ai/stores/chatStore.ts',
              './src/modules/ai/services/chatService.ts',
              './src/modules/ai/services/modelService.ts',
              './src/modules/ai/services/jobService.ts'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000
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
