import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig(({ mode }) => ({
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
  },
}));
