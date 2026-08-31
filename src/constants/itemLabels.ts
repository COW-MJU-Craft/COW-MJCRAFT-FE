import type { ItemSaleType, ItemType } from '../api/site/items';

export const ITEM_SALE_TYPE_LABELS: Record<ItemSaleType, string> = {
  NORMAL: '바로 구매',
  GROUPBUY: '공동 구매',
};

export const ITEM_TYPE_LABELS: Record<Exclude<ItemType, null>, string> = {
  PHYSICAL: '실물 상품',
  DIGITAL_JOURNAL: '디지털 다운로드',
};

export function getItemSaleTypeLabel(value?: string | null) {
  if (!value) return '상품';
  return ITEM_SALE_TYPE_LABELS[value as ItemSaleType] ?? '상품';
}

export function getItemTypeLabel(value?: string | null) {
  if (!value) return '상품';
  return ITEM_TYPE_LABELS[value as ItemType] ?? '상품';
}
