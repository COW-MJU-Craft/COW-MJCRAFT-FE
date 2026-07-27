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
    // 루트 기준 패턴(`node_modules/**`)은 중첩된 체크아웃(git worktree 등)의
    // node_modules를 거르지 못해 남의 테스트까지 끌어온다. `**/`로 위치를 열어둔다.
    // 에이전트 도구가 레포 안에 만드는 worktree도 같은 이유로 제외한다.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.claude/worktrees/**',
    ],
  },
});
