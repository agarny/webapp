/// <reference types="node" />

import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as electronVite from 'electron-vite';
import * as fs from 'node:fs';
import path from 'node:path';
import vitePlugin from 'unplugin-vue-components/vite';

import { libopencorVersion } from './src/renderer/scripts/libopencor.version';
import { stripPrimeIconsFontFacePlugin } from './src/renderer/scripts/primeicons.plugin';

export default electronVite.defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    ssr: {
      external: ['electron']
    }
  },
  preload: {},
  renderer: {
    build: {
      target: 'esnext'
    },
    define: {
      __LIBOPENCOR_WASM_VERSION__: JSON.stringify(libopencorVersion)
    },
    envDir: path.join(import.meta.dirname, 'src/renderer'),
    plugins: [
      // Note: this must be in sync with src/renderer/vite.config.ts.

      tailwindcssPlugin(),
      stripPrimeIconsFontFacePlugin(),
      vuePlugin({
        script: {
          fs: {
            fileExists: (file: string) => fs.existsSync(file),
            readFile: (file: string) => fs.readFileSync(file, 'utf-8'),
            realpath: (file: string) => fs.realpathSync(file)
          }
        }
      }),
      vitePlugin({
        resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
      })
    ],
    server: {
      fs: {
        allow: [path.join(import.meta.dirname, '..')]
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    }
  }
});
