import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two pages: index.html (the scroll story, src/v4/) and v3.html (the Next-button page, src/App.jsx).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v3: fileURLToPath(new URL('./v3.html', import.meta.url)),
      },
    },
  },
})
