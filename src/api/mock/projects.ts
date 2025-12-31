// src/api/mock/projects.ts
export type ProjectStatus = 'upcoming' | 'active' | 'closed';

export type ProjectOption = {
  name: string;
  values: string[];
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  startAt: string;
  endAt: string;
  price?: number;
  options?: ProjectOption[];
};

export const projects: Project[] = [
  {
    id: 'spring-keyring',
    title: '봄맞이 키링 프로젝트',
    summary: '학교 마스코트 컬러로 제작한 키링 굿즈',
    status: 'active',
    startAt: '2026-01-10',
    endAt: '2026-02-15',
    price: 7900,
    options: [
      { name: '컬러', values: ['네이비(#022964)', '오프화이트'] },
      { name: '고리', values: ['기본', '하트'] },
    ],
  },
  {
    id: 'sticker-pack',
    title: '스티커 팩 프로젝트',
    summary: '동아리 일러스트 스티커 6종 세트',
    status: 'upcoming',
    startAt: '2026-03-01',
    endAt: '2026-03-20',
    price: 5900,
  },
  {
    id: 'hoodie',
    title: '후드티 프로젝트',
    summary: '프리오더로 진행한 후드티 굿즈',
    status: 'closed',
    startAt: '2025-10-01',
    endAt: '2025-10-20',
    price: 39000,
    options: [{ name: '사이즈', values: ['S', 'M', 'L', 'XL'] }],
  },
];

export function getProjectById(id: string) {
  return projects.find((p) => p.id === id);
}
