import { defineConfig } from 'vite';
// base './' makes every path relative, so the built site works from any folder or host
export default defineConfig({ base: './', build: { assetsInlineLimit: 0 } });
