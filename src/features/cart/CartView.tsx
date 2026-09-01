import { Link } from 'react-router-dom';
import Reveal from '../../components/ui/Reveal';
import { buildMediaUrlCandidates } from '../../utils/common/media';
import type { useCart } from './useCart';

type CartViewProps = ReturnType<typeof useCart>;

function formatMoney(value: number) {
  return value.toLocaleString();
}

export default function CartView({
  items,
  thumbFallbackIndex,
  setThumbFallbackIndex,
  totalCount,
  totalPrice,
  hasNonOpenItem,
  onRemoveItem,
  onSetQuantity,
  onClearMergedNotice,
  handleCheckout,
  handleClear,
}: CartViewProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-4">
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
              장바구니 {items.length > 0 && `(${totalCount}개)`}
            </Link>
            <div className="flex gap-2">
              <Link
                to="/orders/lookup"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                주문 조회
              </Link>
            </div>
          </div>
        </Reveal>

        {items.length === 0 ? (
          <Reveal className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-500">장바구니에 담긴 상품이 없어요</p>
            <Link
              to="/projects"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
            >
              상품 보러 가기
            </Link>
          </Reveal>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <Reveal className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.itemId}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <Link
                    to={`/projects/${item.projectId}/items/${item.itemId}`}
                    className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                  >
                    {(() => {
                      const key = String(item.itemId);
                      const candidates = buildMediaUrlCandidates(
                        item.thumbnailUrl,
                        item.thumbnailKey ?? null,
                      );
                      const currentIdx = thumbFallbackIndex[key] ?? 0;
                      const src = candidates[currentIdx] ?? '';

                      if (!src) {
                        return (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                            이미지 없음
                          </div>
                        );
                      }

                      return (
                        <img
                          src={src}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={() => {
                            setThumbFallbackIndex((prev) => {
                              const idx = prev[key] ?? 0;
                              if (idx >= candidates.length - 1) return prev;
                              return { ...prev, [key]: idx + 1 };
                            });
                          }}
                        />
                      );
                    })()}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/projects/${item.projectId}/items/${item.itemId}`}
                        className="line-clamp-2 text-sm font-bold text-slate-900 hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.itemId)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="삭제"
                      >
                        삭제
                      </button>
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {formatMoney(item.price)}원
                      {item.quantity > 1 && (
                        <span className="ml-1 text-slate-400">
                          × {item.quantity}
                        </span>
                      )}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              onSetQuantity(
                                item.itemId,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            className="h-9 w-9 text-slate-600 hover:bg-slate-50"
                            aria-label="수량 감소"
                          >
                            −
                          </button>
                          <span className="grid h-9 min-w-9 place-items-center border-x border-slate-200 text-sm font-semibold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onSetQuantity(
                                item.itemId,
                                item.quantity + 1,
                              )
                            }
                            className="h-9 w-9 text-slate-600 hover:bg-slate-50"
                            aria-label="수량 증가"
                          >
                            +
                          </button>
                        </div>
                        {item.mergedByDuplicateAdd && (
                          <p className="text-xs font-semibold text-primary">
                            동일 상품 합쳐짐
                            <button
                              type="button"
                              onClick={() => onClearMergedNotice(item.itemId)}
                              className="ml-1 underline"
                            >
                              닫기
                            </button>
                          </p>
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {formatMoney(item.price * item.quantity)}원
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </Reveal>

            <Reveal>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
                <h2 className="text-base font-bold text-slate-900">주문 요약</h2>
                <div className="mt-4 space-y-3 border-b border-slate-100 pb-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>상품 금액</span>
                    <span className="font-medium text-slate-800">
                      {formatMoney(totalPrice)}원
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>상품 수량</span>
                    <span className="font-medium text-slate-800">
                      {totalCount}개
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between py-2">
                  <span className="text-base font-bold text-slate-900">
                    총 주문 금액
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatMoney(totalPrice)}원
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  {hasNonOpenItem && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      진행중이 아닌 상품이 있어 주문할 수 없어요. 삭제 후 주문해 주세요.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCheckout()}
                    disabled={hasNonOpenItem}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    주문하기
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClear()}
                    className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    장바구니 비우기
                  </button>
                </div>
              </section>
            </Reveal>
          </div>
        )}
      </div>
    </div>
  );
}
