import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const PKG = JSON.parse(json);

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
        '$components': path.resolve(__dirname, './src/components'),
        '$stores': path.resolve(__dirname, './src/stores')
    }
  },
  define: {
      PKG
  }
});
