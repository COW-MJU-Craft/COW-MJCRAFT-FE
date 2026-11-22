import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AdminHeaderDesktop from './AdminHeaderDesktop';
import { GA_REPORT_LINK } from '../../constants/adminLinks';

vi.mock('../../api/admin/admin', () => ({ adminApi: { logout: vi.fn() } }));

afterEach(cleanup);

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminHeaderDesktop />
    </MemoryRouter>,
  );
}

it('GA 보고서 링크를 새 탭으로 안전하게 연다', () => {
  renderHeader();

  const link = screen.getByRole('link', { name: /분석/ });

  expect(link).toHaveAttribute('href', GA_REPORT_LINK.href);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link.getAttribute('rel')).toContain('noopener');
  expect(link.getAttribute('rel')).toContain('noreferrer');
});

it('GA 링크는 외부 주소이고 관리자 내부 이동 링크와 섞이지 않는다', () => {
  renderHeader();

  expect(GA_REPORT_LINK.href).toMatch(/^https:\/\/analytics\.google\.com\//);
  expect(screen.getByRole('link', { name: '정산' })).toHaveAttribute(
    'href',
    '/admin#payouts',
  );
});
