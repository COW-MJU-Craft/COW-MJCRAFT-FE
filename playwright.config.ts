import { defineConfig, devices } from '@playwright/test';

// 스모크 테스트: 빌드된 프로덕션 번들을 `vite preview`로 띄워서
// 핵심 라우트가 실제로 렌더링되는지만 확인한다. 데이터 유무에 좌우되는
// 어서션(공지/프로젝트 목록 내용 등)은 피하고, API 응답과 무관하게
// 항상 렌더링되는 레이아웃 요소(footer, 로그인 폼, 관리자 리다이렉트)만 검증한다.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
