import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Reveal from '../../../components/ui/Reveal';
import BackArrowIcon from '../../../components/ui/BackArrowIcon';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import { adminProjectsApi, type AdminProjectResponse } from '../../../api/admin/projects';
import { adminItemsApi, type AdminItemResponse } from '../../../api/admin/items';

const STATUS_LABELS: Record<string, string> = {
  PREPARING: '준비중',
  OPEN: '진행중',
  CLOSED: '마감',
};

const SALETYPE_LABELS: Record<string, string> = {
  NORMAL: '일반',
  GROUPBUY: '공구',
};

function toTimestamp(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [y, m, d] = value as number[];
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d).getTime();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString();
}

export default function AdminProjectItemsListPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const confirm = useConfirm();
  const toast = useToast();
  const [project, setProject] = useState<AdminProjectResponse | null>(null);
  const [items, setItems] = useState<AdminItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [projectDetail, list] = await Promise.all([
        adminProjectsApi.getById(projectId),
        adminItemsApi.listByProject(projectId),
      ]);
      setProject(projectDetail ?? null);
      setItems(list ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // 프로젝트 아이템 목록 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
    );
  }, [items]);

  const emptyState = useMemo(() => {
    if (loading) return '불러오는 중...';
    if (sortedItems.length === 0) return '아직 등록된 상품이 없어요.';
    return null;
  }, [loading, sortedItems.length]);

  const handleDelete = useCallback(
    async (target: AdminItemResponse) => {
      if (!target.id || deletingId) return;
      const ok = await confirm.open({
        title: '상품 삭제',
        description: '상품을 삭제할까요? 삭제 후 재등록 해야 해요.',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;

      const prev = items;
      setDeletingId(target.id);
      setItems((current) => current.filter((item) => item.id !== target.id));

      try {
        await adminItemsApi.deleteItem(String(target.id));
        toast.success('삭제했어요');
      } catch (err) {
        setItems(prev);
        setError(err instanceof Error ? err.message : '삭제에 실패했어요.');
        toast.error('삭제에 실패했어요');
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deletingId, items, toast],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin/projects')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              프로젝트 목록
            </button>
            <h1 className="mt-2 font-heading text-3xl text-primary">
              {project?.title ?? '프로젝트 상품 관리'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              이 프로젝트에 등록된 상품이에요
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/projects/${projectId}/items/new`)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
            >
              상품 추가
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={120} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p>
        )}

        {emptyState ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <p className="font-semibold">{emptyState}</p>
            {sortedItems.length === 0 && !loading && (
              <button
                type="button"
                onClick={() => navigate(`/admin/projects/${projectId}/items/new`)}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
              >
                첫 상품 추가
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedItems.map((item) => {
              const saleTypeLabel = SALETYPE_LABELS[item.saleType] ?? item.saleType;
              const statusLabel = STATUS_LABELS[item.status] ?? item.status;
              const isGroupbuy = item.saleType === 'GROUPBUY';
              const isJournal = item.itemType === 'DIGITAL_JOURNAL';

              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-primary/40 hover:bg-white"
                >
                  <Link
                    to={`/admin/items/${item.id}`}
                    className="flex gap-4"
                  >
                    <div className="h-20 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                          대표 이미지 없음
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.name}</p>
                          {item.summary && (
                            <p className="text-xs text-slate-500">{item.summary}</p>
                          )}
                          {!isJournal && (
                            <p className="text-xs text-slate-500">{formatMoney(item.price)}원</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-[10px] font-bold',
                              isGroupbuy
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600',
                            ].join(' ')}
                          >
                            {saleTypeLabel}
                          </span>
                          <span
                            className={[
                              'inline-flex rounded-full px-2 py-1 text-[10px] font-bold',
                              item.status === 'OPEN'
                                ? 'bg-emerald-50 text-emerald-600'
                                : item.status === 'PREPARING'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-rose-50 text-rose-600',
                            ].join(' ')}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      {isGroupbuy && (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-[11px] text-amber-700">
                          <div>
                            <span className="text-[10px] text-amber-500">목표 수량</span>
                            <p className="font-semibold">{formatMoney(item.targetQty)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500">펀딩 수량</span>
                            <p className="font-semibold">{formatMoney(item.fundedQty)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500">달성률</span>
                            <p className="font-semibold">
                              {item.achievementRate ?? '-'}%
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-500">남은 수량</span>
                            <p className="font-semibold">{formatMoney(item.remainingQty)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? '삭제 중...' : '삭제'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>
    </div>
  );
}
