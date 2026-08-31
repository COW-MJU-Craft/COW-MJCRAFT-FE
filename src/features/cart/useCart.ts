import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../components/confirm/useConfirm';
import { useToast } from '../../components/toast/useToast';
import { itemsApi } from '../../api/site/items';
import {
  CART_CHANGED_EVENT,
  clearCartItems,
  clearMergedNotice,
  getCartCount,
  getCartTotal,
  loadCartItems,
  removeCartItem,
  setCartItemQuantity,
  type CartItem,
  updateCartItemMedia,
} from '../../utils/cart/cart';

export function useCart() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => loadCartItems());
  const [thumbFallbackIndex, setThumbFallbackIndex] = useState<
    Record<string, number>
  >({});
  const confirm = useConfirm();
  const toast = useToast();
  const refreshedMediaItemIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setItems(loadCartItems());
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const looksLikeExpiredPresignedUrl = (url?: string | null) => {
      if (!url) return false;
      return (
        /X-Amz-Algorithm=/i.test(url) ||
        /X-Amz-Signature=/i.test(url) ||
        /amazonaws\.com/i.test(url)
      );
    };

    const refreshMedia = async () => {
      for (const item of items) {
        if (!active) return;

        const itemKey = String(item.itemId);
        if (refreshedMediaItemIdsRef.current.has(itemKey)) continue;

        if (item.thumbnailKey && !looksLikeExpiredPresignedUrl(item.thumbnailUrl))
          continue;

        refreshedMediaItemIdsRef.current.add(itemKey);
        try {
          const latest = await itemsApi.getById(item.projectId, item.itemId);
          const nextThumbnailUrl = latest.thumbnailUrl ?? null;
          const nextThumbnailKey = latest.thumbnailKey ?? null;
          if (
            nextThumbnailUrl !== (item.thumbnailUrl ?? null) ||
            nextThumbnailKey !== (item.thumbnailKey ?? null)
          ) {
            updateCartItemMedia(item.itemId, {
              thumbnailUrl: nextThumbnailUrl,
              thumbnailKey: nextThumbnailKey,
            });
          }
        } catch {
          // 개별 아이템 갱신 실패는 무시하고 다음 아이템 진행
        }
      }
    };

    void refreshMedia();

    return () => {
      active = false;
    };
  }, [items]);

  useEffect(() => {
    const existingIds = new Set(items.map((item) => String(item.itemId)));
    refreshedMediaItemIdsRef.current.forEach((id) => {
      if (!existingIds.has(id)) refreshedMediaItemIdsRef.current.delete(id);
    });
  }, [items]);

  const totalCount = useMemo(() => getCartCount(items), [items]);
  const totalPrice = useMemo(() => getCartTotal(items), [items]);
  const hasNonOpenItem = useMemo(
    () => items.some((item) => item.status && item.status !== 'OPEN'),
    [items],
  );

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.info('장바구니가 비어 있어요.');
      return;
    }
    if (hasNonOpenItem) {
      toast.error('진행중이 아닌 상품이 있어 주문을 진행할 수 없어요.');
      return;
    }
    const confirmed = await confirm.open({
      title: '주문서를 작성할까요?',
      description: '장바구니 상품으로 주문서를 작성합니다.',
      confirmText: '주문서 작성',
      cancelText: '계속 쇼핑',
    });
    if (!confirmed) return;
    navigate('/order', { state: { source: 'cart' } });
  };

  const handleClear = async () => {
    if (items.length === 0) return;
    const confirmed = await confirm.open({
      title: '장바구니 비우기',
      description: '장바구니의 상품을 모두 삭제할까요?',
      confirmText: '모두 삭제',
      cancelText: '취소',
      danger: true,
    });
    if (!confirmed) return;
    clearCartItems();
    toast.success('장바구니를 비웠어요.');
  };

  return {
    items,
    thumbFallbackIndex,
    setThumbFallbackIndex,
    totalCount,
    totalPrice,
    hasNonOpenItem,
    onRemoveItem: removeCartItem,
    onSetQuantity: setCartItemQuantity,
    onClearMergedNotice: clearMergedNotice,
    handleCheckout,
    handleClear,
  };
}
