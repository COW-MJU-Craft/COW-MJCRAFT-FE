import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addCartItem,
  CART_STORAGE_KEY,
  loadCartItems,
  setCartItemQuantity,
} from './cart';

const cartItem = {
  itemId: 'item-1',
  projectId: 'project-1',
  name: '아크릴 키링',
  price: 3000,
  maxQuantity: 13,
};

describe('cart stock quantity limit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('동일 상품을 다시 담아도 저장된 재고 한도를 넘지 않는다', () => {
    addCartItem({ ...cartItem, quantity: 10 });
    addCartItem({ ...cartItem, quantity: 5 });

    expect(loadCartItems()).toEqual([
      expect.objectContaining({
        itemId: 'item-1',
        quantity: 13,
        maxQuantity: 13,
        mergedByDuplicateAdd: true,
      }),
    ]);
  });

  it('장바구니 수량 변경도 저장된 재고 한도를 넘지 않는다', () => {
    addCartItem({ ...cartItem, quantity: 1 });

    setCartItemQuantity('item-1', 25);

    expect(loadCartItems()[0].quantity).toBe(13);
  });

  it('기존 저장 데이터가 재고 한도를 넘으면 불러올 때 보정한다', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          ...cartItem,
          thumbnailUrl: null,
          quantity: 25,
        },
      ]),
    );

    expect(loadCartItems()[0]).toMatchObject({
      quantity: 13,
      maxQuantity: 13,
    });
  });
});
