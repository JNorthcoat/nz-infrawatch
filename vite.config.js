import { defineConfig } from 'vite';

export default defineConfig({
  base: '/nz-infrawatch/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    open: true,
  },
});
