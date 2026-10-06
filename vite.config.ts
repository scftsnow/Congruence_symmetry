import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 배포: https://scftsnow.github.io/Congruence_symmetry/
// 저장소 이름이 URL 경로에 들어가므로 base를 반드시 설정해야 한다.
// (설정하지 않으면 배포 시 JS/CSS가 404로 깨진다)
export default defineConfig({
  plugins: [react()],
  base: '/Congruence_symmetry/',
})