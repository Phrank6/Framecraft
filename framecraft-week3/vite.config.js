import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Two pages: the storyboard editor (index.html) and the Week 1 rendering studies (studies.html).
// /api/* goes to the local AI server (npm run ai-server), so the API key stays on the server.
export default defineConfig({
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
    build: {
        rollupOptions: {
            input: { editor: resolve(import.meta.dirname, 'index.html'), studies: resolve(import.meta.dirname, 'studies.html') },
        },
    },
});
