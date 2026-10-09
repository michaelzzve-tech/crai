import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas para que la app funcione en GitHub Pages (https://usuario.github.io/crai/).
  base: './',
})
