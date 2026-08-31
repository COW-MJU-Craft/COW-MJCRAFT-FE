import { useMemo, useRef, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import {
  adminFeedbackApi,
  type AdminFeedbackResponse,
  type AdminFeedbackStatus,
} from '../../../api/adminFeedback';

type Props = {
  entries: AdminFeedbackResponse[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

type FilterStatus = 'all' | 'RECEIVED' | 'ANSWERED';
type SortOrder = 'desc' | 'asc';

const FEEDBACKS_PER_PAGE = 5;

const STATUS_OPTIONS: { label: string; value: AdminFeedbackStatus }[] = [
  { label: '접수', value: 'RECEIVED' },
  { label: '답변 완료', value: 'ANSWERED' },
];

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: '최신순', value: 'desc' },
  { label: '오래된순', value: 'asc' },
];

function getTime(value?: string | number[] | null) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function AdminFeedbackListSection({
  entries,
  loading,
  error,
  onRefresh,
}: Props) {
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const [savingIds, setSavingIds] = useState<number[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<
    Record<number, AdminFeedbackStatus>
  >({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [answeredOnly, setAnsweredOnly] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const initialAnswers = useMemo(() => {
    const map: Record<number, string> = {};
    entries.forEach((entry) => {
      map[entry.id] = entry.answer ?? '';
    });
    return map;
  }, [entries]);

  const initialStatuses = useMemo(() => {
    const map: Record<number, AdminFeedbackStatus> = {};
    entries.forEach((entry) => {
      map[entry.id] = (entry.status ?? 'RECEIVED') as AdminFeedbackStatus;
    });
    return map;
  }, [entries]);

  const getAnswer = (id: number) =>
    answerDrafts[id] ?? initialAnswers[id] ?? '';

  const getStatus = (id: number) =>
    statusDrafts[id] ?? initialStatuses[id] ?? 'RECEIVED';

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();

    const next = entries.filter((entry) => {
      const status = (entry.status ?? 'RECEIVED') as AdminFeedbackStatus;

      if (answeredOnly && status !== 'ANSWERED') return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (!q) return true;
      const title = entry.title?.toLowerCase() ?? '';
      const content = entry.content?.toLowerCase() ?? '';
      return title.includes(q) || content.includes(q);
    });

    return next.sort((a, b) => {
      const timeA = getTime(a.createdAt ?? a.updatedAt);
      const timeB = getTime(b.createdAt ?? b.updatedAt);

      if (timeA !== 0 || timeB !== 0) {
        const diff = timeB - timeA;
        return sortOrder === 'desc' ? diff : -diff;
      }

      // createdAt이 없으면 id 기준 정렬
      const diff = b.id - a.id;
      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [entries, query, statusFilter, sortOrder, answeredOnly]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / FEEDBACKS_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEntries = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * FEEDBACKS_PER_PAGE;
    return filteredEntries.slice(startIndex, startIndex + FEEDBACKS_PER_PAGE);
  }, [filteredEntries, safeCurrentPage]);

  const scrollToSectionTop = () => {
    requestAnimationFrame(() => {
      sectionTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    scrollToSectionTop();
  };

  const handleSave = async (entry: AdminFeedbackResponse) => {
    const id = entry.id;
    const answer = getAnswer(id).trim();
    const status = getStatus(id);

    if (!answer && status === 'ANSWERED') {
      setSaveMsg('답변 완료로 변경하려면 답변 내용을 입력해주세요.');
      return;
    }

    setSavingIds((prev) => [...prev, id]);
    setSaveMsg(null);

    try {
      await adminFeedbackApi.update(id, {
        answer,
        status,
      });
      setSaveMsg('저장했어요.');
      onRefresh();
    } catch {
      setSaveMsg('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleDelete = async (entry: AdminFeedbackResponse) => {
    const ok = window.confirm(`"${entry.title}" 피드백을 삭제할까요?`);
    if (!ok) return;

    setDeletingIds((prev) => [...prev, entry.id]);
    setSaveMsg(null);

    try {
      await adminFeedbackApi.remove(entry.id);
      setSaveMsg('피드백을 삭제했어요.');
      onRefresh();
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.';
      setSaveMsg(msg);
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== entry.id));
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const renderStatusBadge = (status?: AdminFeedbackStatus | null) => {
    const value = status ?? 'RECEIVED';
    const isAnswered = value === 'ANSWERED';
    return (
      <span
        className={[
          'rounded-full px-2 py-0.5 text-[11px] font-bold',
          isAnswered
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
        ].join(' ')}
      >
        {isAnswered ? '답변 완료' : '접수'}
      </span>
    );
  };

  return (
    <Reveal
      id="feedback"
      delayMs={280}
      className="mt-10 rounded-3xl bg-white p-8"
    >
      <div
        ref={sectionTopRef}
        className="scroll-mt-24 flex flex-wrap items-center justify-between gap-2 sm:scroll-mt-28"
      >
        <div>
          <h2 className="font-heading text-xl text-slate-900">
            피드백 응답 목록
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            상태/답변을 변경한 뒤 저장 버튼을 눌러야 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          새로고침
        </button>
      </div>

      {saveMsg && (
        <p className="mt-3 text-xs font-semibold text-slate-600">{saveMsg}</p>
      )}

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="제목/내용 검색"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 md:flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as FilterStatus);
            setCurrentPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <option value="all">전체 상태</option>
          <option value="RECEIVED">접수</option>
          <option value="ANSWERED">답변 완료</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as SortOrder);
            setCurrentPage(1);
          }}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={answeredOnly}
            onChange={(e) => {
              setAnsweredOnly(e.target.checked);
              setCurrentPage(1);
            }}
          />
          답변 완료만 보기
        </label>

        <p className="text-xs font-semibold text-slate-500 md:ml-2">
          총 {filteredEntries.length}개
        </p>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>}

      {error && (
        <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
      )}

      {!loading && !error && filteredEntries.length === 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          등록된 피드백이 없습니다.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {paginatedEntries.map((entry) => {
          const isSaving = savingIds.includes(entry.id);
          const isDeleting = deletingIds.includes(entry.id);
          const isExpanded = expandedIds.includes(entry.id);
          const contentText = entry.content ?? '';
          const isLong = contentText.length > 140;
          const contentPreview = isExpanded
            ? contentText
            : contentText.slice(0, 140);

          return (
            <div
              key={entry.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {renderStatusBadge(entry.status)}
                    <span>#{entry.id}</span>
                  </div>

                  <p className="mt-2 break-all text-sm font-semibold text-slate-900 wrap:anywhere">
                    {entry.title}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-all text-sm text-slate-700 wrap:anywhere">
                    {contentPreview}
                    {!isExpanded && isLong ? '...' : ''}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id)}
                      className="mt-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {isExpanded ? '접기' : '더보기'}
                    </button>
                  )}
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleDelete(entry)}
                    disabled={isDeleting}
                    className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <textarea
                  value={getAnswer(entry.id)}
                  onChange={(e) =>
                    setAnswerDrafts((prev) => ({
                      ...prev,
                      [entry.id]: e.target.value,
                    }))
                  }
                  placeholder="답변 내용을 입력해주세요."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                />

                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
                  <select
                    value={getStatus(entry.id)}
                    onChange={(e) =>
                      setStatusDrafts((prev) => ({
                        ...prev,
                        [entry.id]: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleSave(entry)}
                    disabled={isSaving}
                    className="rounded-xl border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-60"
                  >
                    {isSaving ? '저장 중...' : '답변 저장'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEntries.length > 0 && totalPages > 1 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-right text-xs font-medium text-slate-500">
            총 {filteredEntries.length}개 · {safeCurrentPage}/{totalPages}{' '}
            페이지
          </p>

          <div className="mt-3 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>

              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                const active = page === safeCurrentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={[
                      'min-w-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </Reveal>
  );
}
