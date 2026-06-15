import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Reveal from '../../components/Reveal';
import { noticesApi, type NoticeResponse } from '../../api/notices';
import { API_BASE } from '../../api/client';
import { formatYmd } from '../../utils/date';

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'with', label: '이미지 있음' },
  { value: 'without', label: '이미지 없음' },
] as const;

function getNoticeTime(value?: string | number | number[] | null) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

type ImageFilter = (typeof FILTER_OPTIONS)[number]['value'];
type SortOrder = 'desc' | 'asc';

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'desc', label: '최신순' },
  { value: 'asc', label: '오래된순' },
];

const PAGE_SIZE = 10;

const PUBLIC_ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');

function resolveLegacyImageUrl(key: string) {
  if (/^https?:\/\//i.test(key)) return key;
  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return '';
  return PUBLIC_ASSET_BASE
    ? `${PUBLIC_ASSET_BASE}/${normalized}`
    : `/${normalized}`;
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNoticeImages(notice: NoticeResponse): string[] {
  const urls = notice.imageUrls?.filter(Boolean) ?? [];
  if (urls.length > 0) return urls;
  return (notice.imageKeys ?? [])
    .map(resolveLegacyImageUrl)
    .filter(Boolean);
}

function highlightText(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const safe = escapeRegExp(q);
  const parts = text.split(new RegExp(`(${safe})`, 'gi'));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={`${part}-${idx}`}
        className="rounded bg-primary/10 px-0.5 text-primary"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function NoticesPage() {
  const [query, setQuery] = useState('');
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);

  const {
    data,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesApi.list(),
  });

  const notices = useMemo<NoticeResponse[]>(() => data ?? [], [data]);
  const error = isError ? '공지사항을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = notices.filter((notice) => {
      const hasImages = getNoticeImages(notice).length > 0;
      if (imageFilter === 'with' && !hasImages) return false;
      if (imageFilter === 'without' && hasImages) return false;

      if (!normalized) return true;
      const title = notice.title?.toLowerCase() ?? '';
      const content = notice.content?.toLowerCase() ?? '';
      return title.includes(normalized) || content.includes(normalized);
    });

    return next.sort((a, b) => {
      const da = getNoticeTime(a.updatedAt ?? a.createdAt);
      const db = getNoticeTime(b.updatedAt ?? b.createdAt);
      const diff = db - da;
      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [imageFilter, notices, query, sortOrder]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  const pagedNotices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const emptyMessage = useMemo(() => {
    if (loading || error) return null;
    if (notices.length === 0) {
      return (
        <div className="py-12 text-center text-sm text-slate-500">
          <p className="font-semibold">아직 등록된 공지사항이 없어요.</p>
          <p className="mt-2 text-xs text-slate-400">
            새로운 소식이 올라오면 여기서 확인할 수 있어요.
          </p>
        </div>
      );
    }
    if (filtered.length === 0) return '조건에 맞는 공지사항이 없어요.';
    return null;
  }, [error, filtered.length, loading, notices.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-heading text-3xl text-primary hover:opacity-90"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              공지사항
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              프로젝트 소식과 공지를 확인하세요.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal
        delayMs={120}
        className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {/* 검색: 모바일에서는 한 줄, 데스크톱에서는 한 줄 */}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="제목/내용 검색"
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 md:flex-1"
          />

          {/* 필터/정렬/총개수: 모바일에서는 1줄, 데스크톱에서는 검색 옆에 붙음 */}
          <div className="flex w-full items-center gap-2 md:w-auto">
            <select
              value={imageFilter}
              onChange={(e) => {
                setImageFilter(e.target.value as ImageFilter);
                setPage(1);
              }}
              className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 md:flex-none md:min-w-[120px]"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as SortOrder);
                setPage(1);
              }}
              className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 md:flex-none md:min-w-[120px]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="shrink-0 text-xs font-semibold text-slate-500 md:ml-1">
              총 {filtered.length}개
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal
        delayMs={180}
        className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white px-4 py-2 shadow-sm"
      >
        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
        {error && (
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        )}

        {emptyMessage && (
          <div className="py-10 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}

        <div className="rounded-3xl">
          {pagedNotices.map((notice, index) => {
            const date = formatYmd(notice.updatedAt ?? notice.createdAt);
            const imageUrl = getNoticeImages(notice)[0] ?? '';
            const isLast = index === pagedNotices.length - 1;
            const displayIndex = (page - 1) * PAGE_SIZE + index + 1;

            return (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className={[
                  'flex items-center gap-4 px-2 py-4 transition hover:bg-slate-50',
                  isLast
                    ? ''
                    : 'shadow-[inset_0_-1px_0_0_rgba(226,232,240,0.9)]',
                ].join(' ')}
              >
                <div className="w-8 text-center text-base font-bold text-slate-400">
                  {displayIndex}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-base font-bold text-slate-900 md:text-lg">
                    {highlightText(notice.title, query)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{date}</p>
                </div>

                {imageUrl && (
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={notice.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                page === 1
                  ? 'border-slate-200 text-slate-300'
                  : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary',
              ].join(' ')}
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={[
                  'h-8 w-8 rounded-full text-xs font-semibold transition',
                  page === num
                    ? 'bg-primary text-white shadow'
                    : 'border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary',
                ].join(' ')}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                page === totalPages
                  ? 'border-slate-200 text-slate-300'
                  : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary',
              ].join(' ')}
            >
              다음
            </button>
          </div>
        )}
      </Reveal>
    </div>
  );
}
