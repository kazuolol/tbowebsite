import { defineConfig, loadEnv } from 'vite';
import glsl from 'vite-plugin-glsl';

const DEFAULT_DEV_BACKEND_ORIGIN = 'http://localhost:4000';

const parseDevBackendOrigin = (value: string | undefined): string => {
  const normalized = value?.trim();
  if (!normalized) {
    return DEFAULT_DEV_BACKEND_ORIGIN;
  }
  return normalized.replace(/\/+$/, '');
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendOrigin = parseDevBackendOrigin(env.VITE_DEV_BACKEND_ORIGIN);

  return {
    plugins: [glsl()],
    define: {
      __TBO_DEV__: mode !== 'production',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) {
              return 'three';
            }
            if (id.includes('/src/ui/MenuIcon3D.ts')) {
              return 'menu-icon';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      open: true,
      proxy: {
        '/v1': {
          target: backendOrigin,
          changeOrigin: true,
        },
        '/healthz': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
