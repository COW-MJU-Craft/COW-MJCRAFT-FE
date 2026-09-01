export type DateLike = string | number[] | Date | null | undefined;

export function parseDateLike(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value as number[];
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatYmd(value: DateLike): string {
  if (!value) return '-';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value as number[];
    if (!y || !m || !d) return '-';
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const date = parseDateLike(value);
    if (date) return formatYmd(date);
    return value.trim() || '-';
  }
  return '-';
}
