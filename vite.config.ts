import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import dts from 'vite-plugin-dts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        module: resolve(__dirname, 'src/module.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@gwenjs/core',
        '@gwenjs/kit',
        /^@gwenjs\/.*/,
      ],
    },
  },
})
