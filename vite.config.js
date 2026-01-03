import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  base: '/jeomgong-calculator/', // 저장소 이름과 똑같이 설정하세요!
})

