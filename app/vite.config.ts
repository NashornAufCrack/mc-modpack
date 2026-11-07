import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Zwei Ziele: "pages" (GitHub Pages, Daten per fetch) und "artifact" (eine einzige HTML-Datei)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [svelte(), tailwindcss(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  build: mode === 'artifact'
    ? { outDir: 'dist-artifact', assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 }
    : { outDir: '../neu', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  server: { fs: { allow: ['..'] } },
}))
