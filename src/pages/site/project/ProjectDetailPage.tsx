import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, Receipt } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { useQueries, useQuery } from '@tanstack/react-query';
import Reveal from '../../../components/ui/Reveal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { SkeletonProjectDetail } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/toast/useToast';
import { projectsApi } from '../../../api/projects';
import { itemsApi } from '../../../api/items';
import type { ItemResponse } from '../../../api/items';
import { addCartItem } from '../../../utils/cart';
import { getItemSaleTypeLabel, getItemTypeLabel } from '../../../constants/itemLabels';

type NormalStockTag = {
  label: string;
  tone: 'info' | 'warning' | 'neutral';
};

const LOW_STOCK_THRESHOLD = 5;

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString();
}

function parseCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeSelectionQuantity(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.trunc(value)));
}

function toInlinePreviewText(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getAvailableStock(item: ItemResponse) {
  const stockQty = parseCount(item.stockQty);
  const remainingQty = parseCount(item.remainingQty);
  return remainingQty ?? stockQty;
}

function isItemSoldOut(item: ItemResponse) {
  if (item.saleType !== 'NORMAL') return false;
  const availableStock = getAvailableStock(item);
  return availableStock !== null && availableStock <= 0;
}

function isPurchasableItem(item: ItemResponse) {
  if (item.itemType === 'DIGITAL_JOURNAL') return false;
  return item.status === 'OPEN' && !isItemSoldOut(item);
}

function getNormalStockTag(availableStock: number | null): NormalStockTag | null {
  if (availableStock === null) {
    return { label: '재고 확인 중', tone: 'neutral' };
  }
  if (availableStock <= 0) {
    return null;
  }
  if (availableStock <= LOW_STOCK_THRESHOLD) {
    return {
      label: `재고 ${availableStock.toLocaleString()}개 남음`,
      tone: 'warning',
    };
  }
  return {
    label: `재고 ${availableStock.toLocaleString()}개`,
    tone: 'info',
  };
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
  });

  const {
    data: itemsData,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ['projectItems', projectId],
    queryFn: () => itemsApi.listByProject(projectId!),
    enabled: !!projectId && !!project,
  });

  const items: ItemResponse[] = useMemo(
    () => (Array.isArray(itemsData) ? itemsData : []),
    [itemsData],
  );
  const itemDetailQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['projectItemDetail', projectId, String(item.id)],
      queryFn: () => itemsApi.getById(projectId!, String(item.id)),
      enabled:
        Boolean(projectId) &&
        (!item.description || item.description.trim().length === 0),
      staleTime: 1000 * 60 * 5,
    })),
  });
  const fallbackDescriptions = useMemo(() => {
    const next: Record<string, string> = {};
    itemDetailQueries.forEach((query, index) => {
      const item = items[index];
      if (!item) return;
      const description = query.data?.description?.trim();
      if (description) {
        next[String(item.id)] = description;
      }
    });
    return next;
  }, [itemDetailQueries, items]);

  const physicalItems = useMemo(
    () => items.filter((item) => item.itemType !== 'DIGITAL_JOURNAL'),
    [items],
  );
  const journalItems = useMemo(
    () => items.filter((item) => item.itemType === 'DIGITAL_JOURNAL'),
    [items],
  );

  useEffect(() => {
    // 프로젝트 전환 시 캐러셀 인덱스 초기화: 외부 상태(라우트 파라미터)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarouselIndex(0);
  }, [projectId]);

  useEffect(() => {
    const existing = new Set(physicalItems.map((item) => String(item.id)));
    const purchasable = new Set(
      physicalItems
        .filter((item) => isPurchasableItem(item))
        .map((item) => String(item.id)),
    );
    // 상품 목록 변경 시 선택 수량 정리: 외부 상태(아이템 목록)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedQuantities((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([itemId, qty]) => {
        if (!existing.has(itemId) || !purchasable.has(itemId)) {
          changed = true;
          return;
        }
        const normalized = normalizeSelectionQuantity(qty);
        if (normalized > 0) next[itemId] = normalized;
      });
      return changed ? next : prev;
    });
  }, [physicalItems]);

  useEffect(() => {
    if (location.hash !== '#apply') return;

    const scrollToApply = () => {
      const target = document.getElementById('apply');
      if (!target) return false;

      const headerOffset = 80;
      const y = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'auto' });
      return true;
    };

    if (scrollToApply()) return;

    const t1 = window.setTimeout(scrollToApply, 0);
    const t2 = window.setTimeout(scrollToApply, 120);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.hash, projectId, project, physicalItems.length, itemsLoading]);

  const handleJournalDownload = useCallback(
    async (target: ItemResponse) => {
      if (!target.id) return;
      if (downloadingId === target.id) return;

      setDownloadingId(target.id);
      try {
        const data = await itemsApi.getJournalDownloadUrl(String(target.id));
        if (!data.downloadUrl) throw new Error('다운로드 URL이 없어요');
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '파일 다운로드에 실패했어요.';
        toast.error(message);
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, toast],
  );

  const getSelectedQuantity = useCallback(
    (itemId: string | number) => {
      const key = String(itemId);
      return selectedQuantities[key] ?? 0;
    },
    [selectedQuantities],
  );

  const setSelectedQuantity = useCallback((itemId: string | number, quantity: number) => {
    const key = String(itemId);
    const normalized = normalizeSelectionQuantity(quantity);
    setSelectedQuantities((prev) => {
      if (normalized <= 0) {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: normalized };
    });
  }, []);

  const incrementSelected = useCallback((itemId: string | number) => {
    setSelectedQuantity(itemId, getSelectedQuantity(itemId) + 1);
  }, [getSelectedQuantity, setSelectedQuantity]);

  const selectedEntries = useMemo(() => {
    return physicalItems
      .filter((item) => isPurchasableItem(item))
      .map((item) => ({ item, quantity: getSelectedQuantity(item.id) }))
      .filter(({ quantity }) => quantity > 0);
  }, [physicalItems, getSelectedQuantity]);

  const selectedTotalQuantity = useMemo(
    () => selectedEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [selectedEntries],
  );
  const selectedTotalPrice = useMemo(
    () => selectedEntries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [selectedEntries],
  );

  const handleAddSelectedToCart = useCallback(() => {
    if (!projectId) {
      toast.error('프로젝트 정보를 찾을 수 없어요.');
      return;
    }
    if (selectedEntries.length === 0) {
      toast.info('먼저 상품을 선택해주세요.');
      return;
    }

    selectedEntries.forEach(({ item, quantity }) => {
      addCartItem({
        itemId: item.id,
        projectId,
        name: item.name,
        price: item.price,
        thumbnailUrl: item.thumbnailUrl,
        thumbnailKey: item.thumbnailKey,
        status: item.status,
        saleType: item.saleType,
        quantity,
      });
    });

    toast.success('선택한 상품을 장바구니에 담았어요.');
    setSelectedQuantities({});
  }, [projectId, selectedEntries, toast]);

  const handleBuySelectedNow = useCallback(() => {
    if (!projectId) {
      toast.error('프로젝트 정보를 찾을 수 없어요.');
      return;
    }
    if (selectedEntries.length === 0) {
      toast.info('먼저 상품을 선택해주세요.');
      return;
    }

    navigate('/order', {
      state: {
        source: 'direct',
        items: selectedEntries.map(({ item, quantity }) => ({
          itemId: String(item.id),
          projectId: String(projectId),
          name: item.name,
          price: item.price,
          thumbnailUrl: item.thumbnailUrl ?? null,
          status: item.status,
          saleType: item.saleType,
          quantity,
        })),
      },
    });
  }, [navigate, projectId, selectedEntries, toast]);

  const carouselImages = useMemo(() => {
    if (!project) return [];
    const list: string[] = [];
    if (project.thumbnailUrl) list.push(project.thumbnailUrl);
    if (project.imageUrls?.length) list.push(...project.imageUrls);
    return list;
  }, [project]);

  if (!projectId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          프로젝트를 찾을 수 없어요
        </h1>
        <Link
          to="/projects"
          className="mt-4 inline-block text-primary hover:underline"
        >
          목록으로 돌아가기 →
        </Link>
      </div>
    );
  }

  if (projectLoading) {
    return <SkeletonProjectDetail />;
  }

  if (projectError || !project) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          프로젝트를 찾을 수 없어요
        </h1>
        <Link
          to="/projects"
          className="mt-4 inline-block text-primary hover:underline"
        >
          목록으로 돌아가기 →
        </Link>
      </div>
    );
  }

  const deadlineText = project.deadlineDate || project.endAt || '';
  const dDayLabel =
    typeof project.dDay === 'number'
      ? project.dDay === 0
        ? 'D-Day'
        : project.dDay > 0
          ? `D-${project.dDay}`
          : `D+${Math.abs(project.dDay)}`
      : null;

  const emptyItemsMessage = itemsLoading
    ? null
    : itemsError
      ? '상품을 불러오지 못했어요.'
      : items.length === 0
        ? '등록된 상품이 없어요'
        : null;

  const canCarouselPrev = carouselImages.length > 1 && carouselIndex > 0;
  const canCarouselNext =
    carouselImages.length > 1 && carouselIndex < carouselImages.length - 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
            <div>
              <Link
                to="/projects"
                className="text-sm font-bold text-primary hover:underline"
              >
                ← 프로젝트 목록
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-3 md:gap-4">
                <StatusBadge
                  status={project.status}
                  className="px-4 py-2 text-sm"
                />

                {deadlineText && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                    마감일 {deadlineText}
                  </span>
                )}

                {project.status === 'CLOSED' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/payouts?projectId=${project.id}`)}
                    aria-label="정산 내역 보기"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    <Receipt className="h-4 w-4" />
                    정산
                  </button>
                ) : (
                  dDayLabel && (
                    <span
                      className={[
                        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700',
                        typeof project.dDay === 'number' && project.dDay <= 7
                          ? 'font-bold text-rose-600'
                          : '',
                      ].join(' ')}
                    >
                      <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                      {dDayLabel}
                    </span>
                  )
                )}
              </div>

              <h1 className="mt-4 font-heading text-3xl text-slate-900">
                {project.title}
              </h1>

              {project.description && project.description.trim().length > 0 ? (
                <div className="mt-4 text-sm text-slate-700">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      h1: ({ ...props }) => (
                        <h3
                          className="mt-5 first:mt-0 text-lg font-heading text-slate-900"
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h4
                          className="mt-4 first:mt-0 text-base font-heading text-slate-900"
                          {...props}
                        />
                      ),
                      p: ({ ...props }) => (
                        <p
                          className="mt-3 first:mt-0 whitespace-normal wrap-break-word leading-relaxed"
                          {...props}
                        />
                      ),
                      ul: ({ ...props }) => (
                        <ul
                          className="mt-3 first:mt-0 list-disc pl-5 space-y-1"
                          {...props}
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="mt-3 first:mt-0 list-decimal pl-5 space-y-1"
                          {...props}
                        />
                      ),
                      a: ({ ...props }) => (
                        <a
                          className="text-primary underline decoration-slate-300 underline-offset-4 wrap-break-word"
                          target="_blank"
                          rel="noreferrer noopener"
                          {...props}
                        />
                      ),
                      code: ({ className, ...props }) => {
                        const isBlock = Boolean(className);
                        if (isBlock) {
                          return (
                            <code
                              className="block whitespace-pre-wrap wrap-break-word"
                              {...props}
                            />
                          );
                        }
                        return (
                          <code
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700"
                            {...props}
                          />
                        );
                      },
                      pre: ({ ...props }) => (
                        <pre
                          className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {project.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-400">
                  등록된 상세 설명이 없어요
                </p>
              )}

            </div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              {carouselImages.length > 0 ? (
                <>
                  <div
                    className="flex h-72 md:h-80"
                    style={{
                      width: `${carouselImages.length * 100}%`,
                      transform: `translateX(-${(carouselIndex / carouselImages.length) * 100}%)`,
                      transition: 'transform 300ms ease-out',
                    }}
                  >
                    {carouselImages.map((url, idx) => (
                      <div
                        key={`carousel-${idx}`}
                        className="h-full shrink-0"
                        style={{ width: `${100 / carouselImages.length}%` }}
                      >
                        <img
                          src={url}
                          alt={
                            idx === 0
                              ? project.title
                              : `${project.title} 상세 이미지 ${idx}`
                          }
                          loading={idx === 0 ? undefined : 'lazy'}
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {carouselImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                        disabled={!canCarouselPrev}
                        className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        aria-label="이전 이미지"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCarouselIndex((i) =>
                            Math.min(carouselImages.length - 1, i + 1),
                          )
                        }
                        disabled={!canCarouselNext}
                        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
                        aria-label="다음 이미지"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {carouselImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCarouselIndex(idx)}
                            className={`h-2 rounded-full transition ${
                              idx === carouselIndex
                                ? 'w-6 bg-white'
                                : 'w-2 bg-white/60 hover:bg-white/80'
                            }`}
                            aria-label={`이미지 ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-400 md:h-80">
                  대표 이미지 없음
                </div>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <div id="apply" className="mt-10">
        <Reveal className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-bold text-slate-900">
                  상품
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  상품 {items.length}개
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {itemsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 h-36 animate-pulse rounded-2xl bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : emptyItemsMessage ? (
              <p
                className={[
                  'text-sm font-semibold',
                  itemsError ? 'text-rose-600' : 'text-slate-500',
                ].join(' ')}
              >
                {emptyItemsMessage}
              </p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  {physicalItems.map((item) => {
                    const saleTypeLabel = getItemSaleTypeLabel(item.saleType);
                    const selectedQty = getSelectedQuantity(item.id);
                    const soldOut = isItemSoldOut(item);
                    const isPurchasable = isPurchasableItem(item);
                    const normalizedName = item.name.trim();
                    const normalizedSummary = item.summary?.trim() ?? '';
                    const hasDistinctSummary =
                      normalizedSummary.length > 0 && normalizedSummary !== normalizedName;
                    const descriptionPreview = toInlinePreviewText(
                      item.description?.trim() ||
                        fallbackDescriptions[String(item.id)] ||
                        '',
                    );
                    const availableStock = getAvailableStock(item);
                    const fundedQty = parseCount(item.fundedQty);
                    const targetQty = parseCount(item.targetQty);
                    const achievementRate = parseCount(item.achievementRate);
                    const normalStockTag =
                      item.saleType === 'NORMAL'
                        ? getNormalStockTag(availableStock)
                        : null;
                    const groupBuySummary =
                      item.saleType === 'GROUPBUY'
                        ? targetQty !== null && fundedQty !== null
                          ? `모집 ${fundedQty.toLocaleString()} / ${targetQty.toLocaleString()}`
                          : achievementRate !== null
                            ? `달성률 ${achievementRate}%`
                            : null
                        : null;

                    return (
                      <article
                        key={item.id}
                        className={[
                          'rounded-2xl border p-5 transition',
                          soldOut
                            ? 'border-slate-200 bg-slate-50/60'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
                        ].join(' ')}
                      >
                        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                          <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                className={[
                                  'h-full w-full object-cover transition',
                                  soldOut ? 'grayscale-[0.8] brightness-95' : '',
                                ].join(' ')}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                                이미지 없음
                              </div>
                            )}
                            {soldOut && (
                              <>
                                <div className="pointer-events-none absolute inset-0 bg-rose-950/20" />
                                <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center rounded-full border border-rose-200 bg-rose-50/95 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-rose-700 shadow-sm">
                                  SOLD OUT
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-col">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge
                                status={item.status}
                                className="px-2.5 py-0.5 text-xs"
                              />
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                {saleTypeLabel}
                              </span>
                            </div>

                            <h3
                              className={[
                                'mt-2 text-base font-bold leading-snug',
                                soldOut ? 'text-slate-400' : 'text-slate-900',
                              ].join(' ')}
                            >
                              {item.name}
                            </h3>

                            {hasDistinctSummary && (
                              <p
                                className={[
                                  'mt-1 text-sm',
                                  soldOut ? 'text-slate-500' : 'text-slate-600',
                                ].join(' ')}
                              >
                                {normalizedSummary}
                              </p>
                            )}
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {descriptionPreview ||
                                '구매/수령/유의사항은 상세 보기에서 확인해주세요.'}
                            </p>

                            <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                              <span
                                className={[
                                  'text-xl font-bold',
                                  soldOut ? 'text-slate-400' : 'text-slate-900',
                                ].join(' ')}
                              >
                                {formatMoney(item.price)}원
                              </span>
                              {item.saleType === 'NORMAL' && normalStockTag && (
                                <span
                                  className={[
                                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none',
                                    normalStockTag.tone === 'warning'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : normalStockTag.tone === 'neutral'
                                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                                        : 'border-sky-200 bg-sky-50 text-sky-700',
                                  ].join(' ')}
                                >
                                  {normalStockTag.tone === 'warning' && (
                                    <span
                                      className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {normalStockTag.label}
                                </span>
                              )}
                              {item.saleType === 'GROUPBUY' && groupBuySummary && (
                                <span className="text-xs font-semibold text-sky-500">
                                  {groupBuySummary}
                                </span>
                              )}
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                              <div className="flex items-center gap-2">
                                {isPurchasable ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => incrementSelected(item.id)}
                                      className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
                                    >
                                      담기
                                    </button>
                                    {selectedQty > 0 && (
                                      <div className="inline-flex h-9 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedQuantity(item.id, selectedQty - 1)
                                          }
                                          className="h-full w-9 text-slate-600 hover:bg-slate-50"
                                          aria-label={`${item.name} 수량 감소`}
                                        >
                                          −
                                        </button>
                                        <span className="grid h-full min-w-9 place-items-center border-x border-slate-200 px-2 text-sm font-bold text-slate-800">
                                          {selectedQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedQuantity(item.id, selectedQty + 1)
                                          }
                                          className="h-full w-9 text-slate-600 hover:bg-slate-50"
                                          aria-label={`${item.name} 수량 증가`}
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : soldOut ? (
                                  <span className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600">
                                    구매 불가
                                  </span>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-400">
                                    {item.status === 'PREPARING'
                                      ? '준비중'
                                      : item.status === 'CLOSED'
                                        ? '마감'
                                        : ''}
                                  </span>
                                )}
                              </div>
                              <Link
                                to={`/projects/${projectId}/items/${item.id}`}
                                className="text-xs font-semibold text-slate-400 transition hover:text-primary"
                              >
                                상세 보기 →
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {journalItems.length > 0 && (
                    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <h3 className="text-sm font-bold text-slate-800">디지털 저널</h3>
                      <div className="mt-3 space-y-3">
                        {journalItems.map((item) => {
                          const isJournalDownloadable = item.status === 'OPEN';
                          const isFreeDistribution = (item.price ?? 0) <= 0;
                          const descriptionPreview = toInlinePreviewText(
                            item.description?.trim() ||
                              fallbackDescriptions[String(item.id)] ||
                              '',
                          );
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-slate-200 bg-white p-3"
                            >
                              <div className="grid gap-3 sm:grid-cols-[90px_1fr] sm:items-center">
                                <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                  {item.thumbnailUrl ? (
                                    <img
                                      src={item.thumbnailUrl}
                                      alt={item.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-400">
                                      이미지 없음
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                      {getItemTypeLabel(item.itemType)}
                                    </span>
                                    {isFreeDistribution && (
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        무료배포
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                                    {item.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-600">
                                    {isFreeDistribution
                                      ? '무료'
                                      : `${formatMoney(item.price)}원`}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                    {descriptionPreview ||
                                      '구매/수령/유의사항은 상세 보기에서 확인해주세요.'}
                                  </p>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isJournalDownloadable) {
                                          void handleJournalDownload(item);
                                        }
                                      }}
                                      disabled={
                                        downloadingId === item.id || !isJournalDownloadable
                                      }
                                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {downloadingId === item.id
                                        ? '다운로드 중...'
                                        : '다운로드'}
                                    </button>
                                    <Link
                                      to={`/projects/${projectId}/items/${item.id}`}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-primary"
                                    >
                                      상세 보기
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
                  <h3 className="text-sm font-bold text-slate-900">선택된 옵션</h3>

                  {selectedEntries.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                      선택한 상품이 여기에 표시됩니다.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedEntries.map(({ item, quantity }) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-xs font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedQuantity(item.id, 0)}
                              className="text-xs text-slate-400 hover:text-rose-600"
                              aria-label={`${item.name} 선택 삭제`}
                            >
                              삭제
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() => setSelectedQuantity(item.id, quantity - 1)}
                                className="h-full w-8 text-slate-600 hover:bg-slate-50"
                                aria-label={`${item.name} 수량 감소`}
                              >
                                −
                              </button>
                              <span className="grid h-full min-w-8 place-items-center border-x border-slate-200 px-1 text-xs font-semibold text-slate-800">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedQuantity(item.id, quantity + 1)}
                                className="h-full w-8 text-slate-600 hover:bg-slate-50"
                                aria-label={`${item.name} 수량 증가`}
                              >
                                +
                              </button>
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                              {formatMoney(item.price * quantity)}원
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">총 수량</span>
                      <span className="font-semibold text-slate-900">
                        {selectedTotalQuantity}개
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">총 금액</span>
                      <span className="text-base font-bold text-slate-900">
                        {formatMoney(selectedTotalPrice)}원
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAddSelectedToCart}
                      disabled={selectedEntries.length === 0}
                      className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      장바구니
                    </button>
                    <button
                      type="button"
                      onClick={handleBuySelectedNow}
                      disabled={selectedEntries.length === 0}
                      className="h-11 rounded-xl bg-primary text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      바로 구매
                    </button>
                  </div>

                  <Link
                    to="/cart"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    장바구니 페이지로 이동
                  </Link>
                </aside>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
