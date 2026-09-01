import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../../../components/ui/Reveal';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import {
  adminNoticesApi,
  type AdminNoticeResponse,
} from '../../../api/admin/notices';
import { formatYmd } from '../../../utils/common/date';

function toSnippet(text?: string | null, max = 120) {
  const trimmed = (text ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
}

function toDateValue(value?: unknown) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value instanceof Date) return value;
  return null;
}

function getImageCount(notice: AdminNoticeResponse) {
  const urlCount = notice.imageUrls?.length ?? 0;
  if (urlCount > 0) return urlCount;
  return notice.imageKeys?.length ?? 0;
}

export default function AdminNoticesListPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();

  const [notices, setNotices] = useState<AdminNoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [imageFilter, setImageFilter] = useState<'all' | 'with' | 'without'>(
    'all'
  );
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminNoticesApi.list();
      setNotices(list ?? []);
    } catch {
      setError('공지사항을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 공지사항 목록 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const next = notices.filter((notice) => {
      const hasImages = getImageCount(notice) > 0;
      if (imageFilter === 'with' && !hasImages) return false;
      if (imageFilter === 'without' && hasImages) return false;

      if (!normalized) return true;
      const title = notice.title?.toLowerCase() ?? '';
      const content = notice.content?.toLowerCase() ?? '';
      return title.includes(normalized) || content.includes(normalized);
    });

    return next.sort((a, b) => {
      const da = toDateValue(a.updatedAt ?? a.createdAt);
      const db = toDateValue(b.updatedAt ?? b.createdAt);
      const diff = (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [imageFilter, notices, query, sortOrder]);

  const handleDelete = useCallback(
    async (notice: AdminNoticeResponse) => {
      const ok = await confirm.open({
        title: '공지사항 삭제',
        description: '이 공지사항을 삭제할까요?',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;

      const typed = window.prompt(
        `삭제하려면 공지 제목을 입력해 주세요.\n제목: ${notice.title}`
      );
      if (typed !== notice.title) {
        toast.error('제목이 일치하지 않아 삭제를 취소했어요.');
        return;
      }

      try {
        await adminNoticesApi.delete(String(notice.id));
        toast.success('삭제했어요');
        await load();
      } catch {
        toast.error('삭제에 실패했어요');
      }
    },
    [confirm, load, toast]
  );

  const emptyMessage = useMemo(() => {
    if (loading || error) return null;
    if (notices.length === 0)
      return (
        <div className="py-12 text-center text-sm text-slate-500">
          <p className="font-semibold">아직 등록된 공지사항이 없어요.</p>
          <p className="mt-2 text-xs text-slate-400">
            오른쪽 상단의 공지사항 작성 버튼을 눌러 새 공지를 추가해 주세요.
          </p>
        </div>
      );
    if (filtered.length === 0) return '조건에 맞는 공지사항이 없어요.';
    return null;
  }, [error, filtered.length, loading, notices.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-primary">
              공지사항 관리
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              공지사항 등록/수정/삭제를 관리할 수 있어요
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/notices/new')}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
          >
            공지사항 작성
          </button>
        </div>
      </Reveal>

      <Reveal
        delayMs={120}
        className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex w-full flex-col gap-2 md:flex-1 md:flex-row md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목/내용 검색"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 md:flex-1"
            />
            <select
              value={imageFilter}
              onChange={(e) =>
                setImageFilter(e.target.value as 'all' | 'with' | 'without')
              }
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="all">이미지 전체</option>
              <option value="with">이미지 있음</option>
              <option value="without">이미지 없음</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
          </div>
          <p className="text-center text-xs font-semibold text-slate-500 md:ml-4 md:text-right">
            총 {filtered.length}개
          </p>
        </div>
      </Reveal>

      <Reveal
        delayMs={180}
        className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
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

        <div className="grid gap-4">
          {filtered.map((notice) => {
            const raw = toDateValue(notice.updatedAt ?? notice.createdAt);
            const date = raw ? formatYmd(raw) : '';
            return (
              <div
                key={notice.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {notice.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {date ? `${date} 업데이트` : '날짜 정보 없음'}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    이미지 {getImageCount(notice)}개
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {toSnippet(notice.content)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/admin/notices/${notice.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    상세
                  </Link>
                  <Link
                    to={`/admin/notices/${notice.id}/edit`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(notice)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
