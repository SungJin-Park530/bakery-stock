import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // GitHub Pages 레포지토리 이름에 구애받지 않도록 상대 경로 설정
})