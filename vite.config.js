import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// brickhampton.github.io is a user site, so it is served from the root.
export default defineConfig({
  base: '/',
  plugins: [react()],
});
