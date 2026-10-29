import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// brickhampton.github.io is a user site, so it is served from the root.
export default defineConfig({
  base: '/',
  plugins: [react()],
  // The database client makes the one bundle a little over Vite's default warning size.
  build: { chunkSizeWarningLimit: 700 },
});
