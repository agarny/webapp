import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver';
import tailwindcssPlugin from '@tailwindcss/vite';
import vuePlugin from '@vitejs/plugin-vue';

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as postcss from 'postcss';
import vitePlugin from 'unplugin-vue-components/vite';
import * as vite from 'vite';

import { downloadLibopencorJsIfNeeded } from './scripts/download.libopencor.js';
import { libopencorVersion } from './scripts/libopencor.version';
import { stripPrimeIconsFontFacePlugin } from './scripts/primeicons.plugin';

await downloadLibopencorJsIfNeeded(
  path.join(import.meta.dirname, 'public', 'libopencor', 'downloads', 'wasm', libopencorVersion)
);

export default vite.defineConfig({
  build: {
    lib: {
      entry: './index.ts',
      fileName: (format) => `opencor.${format}.js`,
      formats: ['es'],
      name: 'OpenCOR'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.names.includes('style.css')) {
            return 'dist/opencor.css';
          }

          return assetInfo.names[0] ?? 'default-name';
        }
      }
    },
    target: 'esnext',
    copyPublicDir: false
    // Note: our public folder only contains libOpenCOR's glue (see downloadLibopencorJsIfNeeded()), which host
    //       applications don't serve from our package anyway (we fall back on importing it from https://opencor.ws in
    //       that case, see src/common/initialisation.ts), so there is no need to ship it.
  },
  publicDir: path.join(import.meta.dirname, 'public'),
  define: {
    __LIBOPENCOR_WASM_VERSION__: JSON.stringify(libopencorVersion)
  },
  plugins: [
    // Note: this must be in sync with vite.config.ts, except for the process-css-layers plugin which is only needed for
    //       the library build (to prevent styles from leaking into and being overridden by host apps).

    {
      // Plugin to process CSS layers for library distribution:
      //  1. Strip @layer base blocks (Tailwind CSS preflight) to prevent leaking into host apps.
      //  2. Unwrap remaining @layer blocks so that the important: '.opencor' selector strategy provides real
      //     specificity protection against host app CSS. (Layered CSS always loses to unlayered CSS, regardless of
      //     specificity.)
      //  3. Remove bare @layer ordering declarations.

      name: 'process-css-layers',
      enforce: 'post' as const,
      generateBundle(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type === 'asset' && typeof asset.source === 'string' && asset.fileName.endsWith('.css')) {
            // Process @layer blocks through a CSS AST:
            //  1. Remove @layer base blocks;
            //  2. Unwrap remaining @layer blocks; and
            //  3. Remove bare @layer ordering declarations.

            const root = postcss.parse(asset.source);

            root.walkAtRules('layer', (atRule) => {
              if (!atRule.nodes || atRule.nodes.length === 0) {
                atRule.remove();

                return;
              }

              if (atRule.params.trim() === 'base') {
                atRule.remove();

                return;
              }

              atRule.replaceWith(...atRule.nodes);
            });

            asset.source = root.toString();
          }
        }
      }
    },
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
  ]
});
