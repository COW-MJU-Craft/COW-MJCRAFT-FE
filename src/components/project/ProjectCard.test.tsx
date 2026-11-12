import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import ProjectCard from './ProjectCard';
import { clearAuth, setAuth } from '../../utils/auth/auth';
import type { Project } from '../../api/site/projects';

const closedProject: Project = {
  id: '1',
  title: '마감된 프로젝트',
  summary: '요약',
  status: 'CLOSED',
  startAt: '',
  endAt: '2026-10-01',
};

function renderCard(project: Project = closedProject) {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  clearAuth();
});

it('비로그인 사용자에게는 마감 프로젝트의 정산 버튼을 숨긴다', () => {
  renderCard();
  expect(screen.queryByRole('button', { name: '정산 내역 보기' })).toBeNull();
});

it('관리자로 로그인하면 마감 프로젝트의 정산 버튼을 보여준다', () => {
  setAuth({ accessToken: 'token', userName: 'admin' });
  renderCard();
  expect(screen.getByRole('button', { name: '정산 내역 보기' })).toBeInTheDocument();
});

it('관리자라도 진행중 프로젝트에는 정산 버튼을 보여주지 않는다', () => {
  setAuth({ accessToken: 'token', userName: 'admin' });
  renderCard({ ...closedProject, status: 'OPEN' });
  expect(screen.queryByRole('button', { name: '정산 내역 보기' })).toBeNull();
});
