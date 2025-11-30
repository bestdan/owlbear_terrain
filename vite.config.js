import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [mkcert()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    host: true, // Listen on all addresses including LAN
    open: false,
    cors: {
      origin: '*',
      credentials: true,
    },
    headers: {
      'Access-Control-Allow-Private-Network': 'true',
    },
  },
  publicDir: 'public'
});
