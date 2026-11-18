import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 모듈 경로(id)에 'firebase'가 포함되어 있으면 'firebase'라는 이름의 청크로 분리
          if (id.includes('firebase')) {
            return 'firebase';
          }
          chunkSizeWarningLimit: 1000
        }
      }
    }
  }
})