import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import vue from '@vitejs/plugin-vue'
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from 'electron-vite'
import * as path from 'path'
import Components from 'unplugin-vue-components/vite'
import { normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    },
    plugins: [bytecodePlugin(), externalizeDepsPlugin()]
  },
  preload: {
    plugins: [
      externalizeDepsPlugin(),
      ...(process.platform === 'win32' && process.env.npm_lifecycle_event !== 'build'
        ? [
            viteStaticCopy({
              targets: [
                {
                  src: normalizePath(path.resolve(import.meta.dirname, 'out/libOpenCOR/Shared/bin/libOpenCOR.dll')),
                  dest: 'chunks'
                }
              ]
            })
          ]
        : [])
    ]
  },
  renderer: {
    build: {
      target: 'esnext'
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    },
    plugins: [
      vue(),
      Components({
        resolvers: [PrimeVueResolver()]
      })
    ],
    server: {
      fs: {
        allow: [path.join(import.meta.dirname, '..')]
      }
    }
  }
})
