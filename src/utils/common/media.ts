import { withApiBase } from '../../api/core/client';

function toAbsoluteCandidate(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return withApiBase(normalized);
}

export function buildMediaUrlCandidates(
  url?: string | null,
  key?: string | null,
): string[] {
  const out: string[] = [];
  const pushUnique = (candidate?: string | null) => {
    if (!candidate) return;
    const trimmed = candidate.trim();
    if (!trimmed) return;
    const resolved = toAbsoluteCandidate(trimmed);
    if (!out.includes(resolved)) out.push(resolved);
  };

  pushUnique(url ?? null);

  const trimmedKey = key?.trim() ?? '';
  if (trimmedKey) {
    pushUnique(trimmedKey);
    if (!trimmedKey.includes('/')) {
      pushUnique(`/files/${trimmedKey}`);
      pushUnique(`/images/${trimmedKey}`);
    }
  }

  return out;
}

