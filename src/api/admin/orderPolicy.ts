import { api, withApiBase } from '../core/client';

export type AdminOrderPolicy = {
  id: number;
  defaultShippingFee: number;
};

export function parseShippingFee(value: string): number {
  const trimmed = value.trim();
  const amount = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isInteger(amount) || amount > 2147483647) {
    throw new Error('배송비는 0~2,147,483,647원 사이의 정수로 입력해주세요.');
  }
  return amount;
}

export const adminOrderPolicyApi = {
  get() {
    return api<AdminOrderPolicy>(withApiBase('/admin/orders/policy'));
  },
  update(defaultShippingFee: number) {
    const amount = parseShippingFee(String(defaultShippingFee));
    return api<AdminOrderPolicy>(withApiBase('/admin/orders/policy'), {
      method: 'PUT',
      body: { defaultShippingFee: amount },
    });
  },
};
