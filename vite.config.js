// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const origin = process.env.VITE_ORIGIN || 'https://frontend-production-2748.up.railway.app';
  const backendUrl = process.env.VITE_BACKEND_URL || 'https://backend-production-6e08.up.railway.app';

  return {
    plugins: [sveltekit()],
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      }
    },
    server: {
      port: process.env.PORT || 5173,  // Railway will provide PORT
      strictPort: true,
      proxy: {
        '/api': {
          target: isProd ? backendUrl : 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.setHeader('Origin', origin);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = origin;
              proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 
                'Content-Type,Authorization,Accept,Accept-Encoding,Origin,Content-Disposition,Referer';
            });
          }
        }
      },
      cors: {
        origin: isProd ? origin : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'Accept',
          'Accept-Encoding',
          'Content-Disposition',
          'Origin',
          'Referer'
        ],
        credentials: true
      }
    },
    build: {
      outDir: 'build',
      target: 'esnext',
      sourcemap: true,
      rollupOptions: {
        external: [/^@sveltejs\/kit/, 'archiver']
      }
    },
    optimizeDeps: {
      include: ['@sveltejs/kit']
    },
    ssr: {
      noExternal: ['@sveltejs/kit']
    },
    define: {
      // Inject environment variables at build time
      'import.meta.env.VITE_ORIGIN': JSON.stringify(origin),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl)
    }
  };
});
