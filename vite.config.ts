import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // rutas relativas: funciona en la raíz o en una subcarpeta (GitHub Pages)
  plugins: [react()],
})
