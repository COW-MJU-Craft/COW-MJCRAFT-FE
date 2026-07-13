import { test, expect } from '@playwright/test';

// 스모크 테스트: 배포 전에 "화면이 아예 안 뜨는" 수준의 회귀를 잡기 위한
// 최소한의 테스트. react/react-dom 버전 불일치로 화면이 백지가 됐던
// 사고(2026-07) 같은 걸 배포 전에 잡아내는 게 목적이라, 특정 데이터
// 내용이 아니라 "핵심 라우트가 렌더링되는지"만 확인한다.

test.describe('스모크: 핵심 라우트 렌더링', () => {
  test('메인 페이지가 렌더링되고 푸터가 보인다', async ({ page }) => {
    await page.goto('/');

    // 공지/프로젝트 데이터 유무와 무관하게 항상 렌더링되는 footer 텍스트로 확인
    await expect(
      page.getByText('명지공방 MJU Craft Studio'),
    ).toBeVisible();
  });

  test('로그인 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { name: '관리자 로그인' }),
    ).toBeVisible();
    await expect(page.getByPlaceholder('아이디를 입력해주세요.')).toBeVisible();
    await expect(
      page.getByPlaceholder('비밀번호를 입력해주세요.'),
    ).toBeVisible();
  });

  test('로그인 없이 관리자 페이지 접근 시 로그인 페이지로 리다이렉트된다', async ({
    page,
  }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: '관리자 로그인' }),
    ).toBeVisible();
  });

  test('프로젝트 목록 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/projects');

    // 로딩/에러/빈 목록 어떤 상태든 페이지 자체는 크래시 없이 떠야 한다
    await expect(
      page.getByText('명지공방 MJU Craft Studio'),
    ).toBeVisible();
  });
});
