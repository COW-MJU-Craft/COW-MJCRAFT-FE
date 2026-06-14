/**
 * 지원서(Recruit) 관련 공통 enum.
 * 백엔드 스펙: departmentType = MARKETING | DESIGN | FINANCE | OPERATION
 */
export const DEPARTMENT_VALUES = [
  'MARKETING',
  'DESIGN',
  'FINANCE',
  'OPERATION',
] as const;

export type DepartmentType = (typeof DEPARTMENT_VALUES)[number];

export const DEPARTMENT_OPTIONS: Array<{ value: DepartmentType; label: string }> = [
  { value: 'MARKETING', label: '마케팅' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'FINANCE', label: '재무' },
  { value: 'OPERATION', label: '기획' },
];

export function getDepartmentLabel(value: DepartmentType | string | null): string {
  if (!value) return '';
  const opt = DEPARTMENT_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}
