import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  return {
    plugins: [vue()],
    base: './',
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
      preprocessorOptions: {
        scss: {
          // Esto silencia las advertencias que vienen de librerías en node_modules
          quietDeps: true,
          
          // Si lo anterior no funciona por la versión de Sass, usa esto:
          silenceDeprecations: ['legacy-js-api', 'if-function', 'import', 'mixed-decls', 'color-functions'],
        },
      },
    },
    resolve: {
      alias: [
        // webpack path resolve to vitejs
        {
          find: /^~(.*)$/,
          replacement: '$1',
        },
        {
          find: '@/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
        {
          find: '@',
          replacement: path.resolve(__dirname, '/src'),
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.scss'],
    },
    server: {
      host: '0.0.0.0', // Esto es vital para Docker
      port: 5173,
      watch: {
        usePolling: true // A veces necesario en Windows para que detecte cambios
      }
    },
  }
})
