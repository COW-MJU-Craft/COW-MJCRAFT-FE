import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // e2e/는 Playwright 전용 테스트라 vitest가 같이 주워서 돌리면
    // test.describe()가 Playwright API로 인식되지 않아 깨진다.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
});
