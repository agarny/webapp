import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

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
            return 'dist/opencor.css'
          }

          return assetInfo.names[0] ?? 'default-name'
        }
      }
    },
    target: 'esnext'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  plugins: [
    tailwindcssPlugin(),
    vuePlugin(),
    vitePlugin({
      resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
    })
  ]
})
