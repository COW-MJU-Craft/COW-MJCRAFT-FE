import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Reveal from '../../../components/ui/Reveal';
import StatusBadge from '../../../components/ui/StatusBadge';
import { SkeletonItemDetail } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/toast/useToast';
import { itemsApi } from '../../../api/items';
import type { ItemResponse } from '../../../api/items';
import type { ProjectStatus } from '../../../api/projects';
import { addCartItem } from '../../../utils/cart';
import { getItemSaleTypeLabel } from '../../../constants/itemLabels';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString();
}

type ItemImageLike = { imageUrl?: string | null; url?: string | null };

type NormalStockTag = {
  label: string;
  tone: 'info' | 'warning' | 'neutral';
};

const LOW_STOCK_THRESHOLD = 5;

type ProductGalleryProps = {
  name: string;
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onOpen: (url: string) => void;
  fallbackLabel: string;
};

type PurchaseCardProps = {
  item: ItemResponse;
  saleTypeLabel: string;
  isPurchasable: boolean;
  isSoldOut: boolean;
  normalStockTag: NormalStockTag | null;
  groupBuySummary: string | null;
  onAddToCart: () => void;
  onBuyNow: () => void;
  showCartNotice: boolean;
};

type DetailImagesViewerProps = {
  name: string;
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onOpen: (url: string) => void;
};

class RenderGuard extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ProductGallery({
  name,
  images,
  activeIndex,
  onSelect,
  onOpen,
  fallbackLabel,
}: ProductGalleryProps) {
  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
        <div className="aspect-5/6 w-full">
          {activeImage ? (
            <button
              type="button"
              onClick={() => onOpen(activeImage)}
              className="h-full w-full"
              aria-label="대표 이미지 크게 보기"
            >
              <img
                src={activeImage}
                alt={name}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
              {fallbackLabel}
            </div>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => onSelect(idx)}
                className={`shrink-0 overflow-hidden rounded-2xl border transition ${
                  idx === activeIndex
                    ? 'border-primary/70'
                    : 'border-slate-200 hover:border-primary/40'
                }`}
                aria-label={`${name} 이미지 ${idx + 1} 보기`}
              >
                <img
                  src={url}
                  alt={`${name} 썸네일 ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseCard({
  item,
  saleTypeLabel,
  isPurchasable,
  isSoldOut,
  normalStockTag,
  groupBuySummary,
  onAddToCart,
  onBuyNow,
  showCartNotice,
}: PurchaseCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:sticky md:top-24">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <StatusBadge status={item.status as ProjectStatus} />
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {saleTypeLabel}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <h1 className="font-heading text-2xl text-slate-900 leading-tight break-keep whitespace-normal md:text-3xl">
          {item.name}
        </h1>
        {item.summary ? (
          <p className="text-sm text-slate-600">{item.summary}</p>
        ) : (
          <p className="text-sm text-slate-500">
            간단한 요약 정보가 아직 없어요.
          </p>
        )}
      </div>

      <div className="mt-6 px-1">
        <p className="text-2xl font-bold text-slate-900">
          {formatMoney(item.price)}원
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {item.saleType === 'NORMAL' && isSoldOut && (
            <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-3.5 py-1.5 text-sm font-semibold leading-none text-rose-700">
              SOLD OUT
            </span>
          )}
          {item.saleType === 'NORMAL' && normalStockTag && (
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold leading-none',
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
            <span className="inline-flex items-center rounded-full bg-sky-50 px-3.5 py-1.5 text-sm font-semibold leading-none text-sky-700">
              {groupBuySummary}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {isPurchasable ? (
          <button
            type="button"
            onClick={onAddToCart}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex-1"
          >
            장바구니 담기
          </button>
        ) : isSoldOut ? (
          <button
            type="button"
            disabled
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-sm font-semibold text-slate-500 sm:flex-1"
          >
            장바구니 불가
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-sm font-semibold text-slate-400 sm:flex-1"
          >
            진행중 상품만 담을 수 있어요
          </button>
        )}

        {isPurchasable ? (
          <button
            type="button"
            onClick={onBuyNow}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:flex-1"
          >
            구매하기
          </button>
        ) : isSoldOut ? (
          <button
            type="button"
            disabled
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-sm font-semibold text-slate-500 sm:flex-1"
          >
            구매 불가
          </button>
        ) : item.status === 'PREPARING' ? (
          <button
            type="button"
            disabled
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-sm font-semibold text-slate-400 sm:flex-1"
          >
            준비 중이에요
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-500 sm:flex-1"
          >
            현재 구매 불가
          </button>
        )}
      </div>

      {showCartNotice && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-slate-700">
          장바구니에 상품을 담았어요{' '}
          <Link to="/cart" className="font-bold text-primary hover:underline">
            바로가기 &gt;
          </Link>
        </div>
      )}

      {!isPurchasable && (
        <p className="mt-3 text-xs text-slate-500">
          {isSoldOut
            ? '현재 재고가 소진되어 구매가 어려워요.'
            : '현재는 구매가 어려운 상태예요. 준비가 완료되면 구매가 가능해요.'}
        </p>
      )}

      <p className="mt-6 text-xs text-slate-500">
        구매/수령/유의사항 등 자세한 안내는 아래 ‘상세 설명’에서 확인해주세요.
      </p>
    </div>
  );
}

function DetailImagesViewer({
  name,
  images,
  activeIndex,
  onSelect,
  onOpen,
}: DetailImagesViewerProps) {
  const preview = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className="mt-5 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm font-semibold text-slate-400">
        등록된 상세 이미지가 없어요
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <div className="aspect-5/6 w-full">
          {preview && (
            <button
              type="button"
              onClick={() => onOpen(preview)}
              className="h-full w-full"
              aria-label="상세 이미지 크게 보기"
            >
              <img
                src={preview}
                alt={`${name} 상세 이미지 ${activeIndex + 1}`}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {images.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => onSelect(idx)}
            className={`shrink-0 overflow-hidden rounded-2xl border transition ${
              idx === activeIndex
                ? 'border-primary/70'
                : 'border-slate-200 hover:border-primary/40'
            }`}
            aria-label={`상세 이미지 ${idx + 1} 보기`}
          >
            <img
              src={url}
              alt={`${name} 상세 썸네일 ${idx + 1}`}
              loading="lazy"
              decoding="async"
              className="h-20 w-20 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProjectItemDetailPage() {
  const { projectId, itemId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const routeKey = `${projectId ?? ''}:${itemId ?? ''}`;
  const hasValidParams = Boolean(projectId && itemId);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState(0);
  const [cartNoticeForKey, setCartNoticeForKey] = useState<string | null>(null);

  const showCartNotice = cartNoticeForKey === routeKey;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [projectId, itemId]);

  const {
    data: item,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ['item', projectId, itemId],
    queryFn: () => itemsApi.getById(projectId!, itemId!),
    enabled: hasValidParams,
  });

  const parseCount = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const getNormalStockTag = (availableStock: number | null): NormalStockTag | null => {
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
  };

  const detailImages = useMemo(() => {
    if (!item) return [];
    const rawUrls = (item as ItemResponse & { imageUrls?: string[] }).imageUrls;
    if (Array.isArray(rawUrls) && rawUrls.length > 0) return rawUrls;
    const rawImages = (item as ItemResponse & { images?: ItemImageLike[] })
      .images;
    if (!Array.isArray(rawImages)) return [];
    return rawImages
      .map((image) => image.imageUrl ?? image.url ?? '')
      .filter((url) => url.length > 0);
  }, [item]);

  const galleryImages = useMemo(() => {
    if (!item) return detailImages;
    const thumbnail = item.thumbnailUrl ?? '';
    const merged = [thumbnail, ...detailImages].filter((url) => url.length > 0);
    return merged.length > 0 ? merged : detailImages;
  }, [detailImages, item]);

  const pushToCart = (target: ItemResponse) => {
    if (!projectId) return false;

    addCartItem({
      itemId: target.id,
      projectId,
      name: target.name,
      price: target.price,
      thumbnailUrl: target.thumbnailUrl,
      thumbnailKey: target.thumbnailKey,
      status: target.status,
      saleType: target.saleType,
      quantity: 1,
    });
    return true;
  };

  if (!hasValidParams) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          상품을 찾을 수 없어요
        </h1>
      </div>
    );
  }

  if (isLoading) {
    return <SkeletonItemDetail />;
  }

  if (isError) {
    const errorMessage =
      queryError instanceof Error
        ? queryError.message
        : '상품을 불러오지 못했어요.';
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          상품을 불러오지 못했어요
        </h1>
        <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
        {projectId && (
          <Link
            to={`/projects/${projectId}`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            프로젝트로 돌아가기 →
          </Link>
        )}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          상품을 찾을 수 없어요
        </h1>
        {projectId && (
          <Link
            to={`/projects/${projectId}`}
            className="mt-4 inline-block text-primary hover:underline"
          >
            프로젝트로 돌아가기 →
          </Link>
        )}
      </div>
    );
  }

  const saleTypeLabel = getItemSaleTypeLabel(item.saleType);
  const stockQty = parseCount(item.stockQty);
  const remainingQty = parseCount(item.remainingQty);
  const fundedQty = parseCount(item.fundedQty);
  const targetQty = parseCount(item.targetQty);
  const achievementRate = parseCount(item.achievementRate);
  const availableStock = remainingQty ?? stockQty;
  const isSoldOut =
    item.saleType === 'NORMAL' &&
    availableStock !== null &&
    availableStock <= 0;
  const isPurchasable = item.status === 'OPEN' && !isSoldOut;
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

  const handleAddToCart = () => {
    if (isSoldOut) {
      toast.error('재고가 소진되어 장바구니에 담을 수 없어요.');
      return;
    }
    if (item.status !== 'OPEN') {
      toast.info('진행중인 상품만 장바구니에 담을 수 있어요.');
      return;
    }
    const ok = pushToCart(item);
    if (!ok) {
      toast.error('프로젝트 정보를 찾을 수 없어요.');
      return;
    }
    setCartNoticeForKey(`${projectId ?? ''}:${itemId ?? ''}`);
    toast.success('장바구니에 상품을 담았어요.');
  };

  const handleBuyNow = () => {
    if (isSoldOut) {
      toast.error('재고가 소진되어 구매할 수 없어요.');
      return;
    }
    if (item.status !== 'OPEN') {
      toast.info('진행중인 상품만 주문할 수 있어요.');
      return;
    }
    if (!projectId) {
      toast.error('프로젝트 정보를 찾을 수 없어요.');
      return;
    }

    navigate('/order', {
      state: {
        source: 'direct',
        items: [
          {
            itemId: String(item.id),
            projectId: String(projectId),
            name: item.name,
            price: item.price,
            thumbnailUrl: item.thumbnailUrl ?? null,
            status: item.status,
            saleType: item.saleType,
            quantity: 1,
          },
        ],
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            to={`/projects/${projectId}`}
            className="text-sm font-bold text-primary hover:underline"
          >
            ← 프로젝트로 돌아가기
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-start">
            <ProductGallery
              name={item.name}
              images={galleryImages}
              activeIndex={Math.min(
                galleryIndex,
                Math.max(0, galleryImages.length - 1),
              )}
              onSelect={setGalleryIndex}
              onOpen={setActiveImage}
              fallbackLabel="대표 이미지가 없어요"
            />
            <PurchaseCard
              item={item}
              saleTypeLabel={saleTypeLabel}
              isPurchasable={isPurchasable}
              isSoldOut={isSoldOut}
              normalStockTag={normalStockTag}
              groupBuySummary={groupBuySummary}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              showCartNotice={showCartNotice}
            />
          </div>

          <div className="mt-10 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl text-slate-900">
                    상세 설명
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    아래 내용에 구매/수령/유의사항이 포함되어 있어요.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-px w-full bg-slate-200" />

              {item.description && item.description.trim().length > 0 ? (
                <div className="mt-5 text-sm text-slate-700">
                  <RenderGuard
                    fallback={
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {item.description}
                      </p>
                    }
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        h1: ({ ...props }) => (
                          <h2
                            className="mt-6 first:mt-0 text-xl font-heading text-slate-900"
                            {...props}
                          />
                        ),
                        h2: ({ ...props }) => (
                          <h3
                            className="mt-6 first:mt-0 text-lg font-heading text-slate-900"
                            {...props}
                          />
                        ),
                        h3: ({ ...props }) => (
                          <h4
                            className="mt-5 first:mt-0 text-base font-heading text-slate-900"
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
                            className="mt-3 first:mt-0 list-disc pl-5 space-y-2"
                            {...props}
                          />
                        ),
                        ol: ({ ...props }) => (
                          <ol
                            className="mt-3 first:mt-0 list-decimal pl-5 space-y-2"
                            {...props}
                          />
                        ),
                        li: ({ ...props }) => (
                          <li
                            className="wrap-break-word leading-relaxed"
                            {...props}
                          />
                        ),
                        hr: ({ ...props }) => (
                          <hr className="my-6 border-slate-200" {...props} />
                        ),
                        strong: ({ ...props }) => (
                          <strong
                            className="font-semibold text-slate-900"
                            {...props}
                          />
                        ),
                        em: ({ ...props }) => (
                          <em className="italic text-slate-700" {...props} />
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
                        blockquote: ({ ...props }) => (
                          <blockquote
                            className="mt-4 rounded-2xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {item.description}
                    </ReactMarkdown>
                  </RenderGuard>
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-slate-400">
                  등록된 상세 설명이 없어요
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl text-slate-900">
                    상세 이미지
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    상품 이미지를 크게 확인할 수 있어요
                  </p>
                </div>
              </div>
              <div className="mt-4 h-px w-full bg-slate-200" />

              <DetailImagesViewer
                name={item.name}
                images={detailImages}
                activeIndex={Math.min(
                  detailIndex,
                  Math.max(0, detailImages.length - 1),
                )}
                onSelect={setDetailIndex}
                onOpen={setActiveImage}
              />
            </section>
          </div>
        </div>
      </Reveal>

      {activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            aria-label="닫기"
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black">
            <img
              src={activeImage}
              alt="상세 이미지 크게 보기"
              loading="eager"
              decoding="async"
              className="max-h-[85vh] w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
