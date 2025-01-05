// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
			// ...existing aliases...
		}
	},
	server: {
		port: Number(process.env.PORT) || 8080, // Changed to explicitly use Number()
		strictPort: true,
		proxy: {
			'/api': {
				target: process.env.APP_API_BASE_URL || 'http://localhost:3000',
				changeOrigin: true
			}
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
	}
});