import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/budget1503/',
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
  },
})
