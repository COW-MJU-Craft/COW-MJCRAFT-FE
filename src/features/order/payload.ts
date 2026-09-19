import type { OrderCreateRequest } from '../../api/site/orders';
import type { OrderDraft } from './types';

export function buildOrderItemsPayload(
  items: OrderDraft['items'],
): OrderCreateRequest['items'] {
  const aggregatedItems = items.reduce<
    Record<
      string,
      { projectItemId: number; quantity: number; optionValueIds: number[] }
    >
  >(
    (acc, item) => {
      const projectItemId = Number(item.itemId);
      if (!Number.isFinite(projectItemId)) return acc;
      const quantity = Number.isFinite(item.quantity)
        ? Math.max(1, item.quantity)
        : 1;
      const optionValueIds = (item.selectedOptions ?? [])
        .map((option) => Number(option.valueId))
        .filter(Number.isFinite)
        .sort((left, right) => left - right);
      const key = `${projectItemId}:${optionValueIds.join(',')}`;
      const current = acc[key];

      acc[key] = {
        projectItemId,
        optionValueIds,
        quantity: (current?.quantity ?? 0) + quantity,
      };
      return acc;
    },
    {},
  );

  return Object.values(aggregatedItems).map(
    ({ projectItemId, quantity, optionValueIds }) => ({
      projectItemId,
      quantity,
      ...(optionValueIds.length > 0 ? { optionValueIds } : {}),
    }),
  );
}

export function buildOrderCreatePayload(
  draft: OrderDraft,
): OrderCreateRequest | null {
  const items = buildOrderItemsPayload(draft.items);
  if (items.length === 0) return null;
  const email = draft.buyer.email.trim();

  return {
    depositorName: draft.payment.depositorName.trim(),
    privacyAgreed: draft.agreements.privacy,
    refundAgreed: draft.agreements.noRefund,
    cancelRiskAgreed: draft.agreements.cancelRisk,
    items,
    buyer: {
      buyerType: draft.buyer.buyerType,
      ...(draft.buyer.buyerType !== 'EXTERNAL'
        ? { campus: draft.buyer.campus }
        : {}),
      name: draft.buyer.name.trim(),
      ...(draft.buyer.buyerType !== 'EXTERNAL'
        ? { departmentOrMajor: draft.buyer.departmentOrMajor.trim() }
        : {}),
      ...(draft.buyer.buyerType === 'STUDENT'
        ? { studentNo: draft.buyer.studentNo.trim() }
        : {}),
      phone: draft.buyer.phone.trim(),
      refundBank: draft.buyer.refundBank.trim(),
      refundAccount: draft.buyer.refundAccount.trim(),
      referralSource: draft.buyer.referralSource.trim(),
      email,
    },
    fulfillment: {
      method: draft.fulfillment.method,
      receiverName: draft.fulfillment.receiverName.trim(),
      receiverPhone: draft.fulfillment.receiverPhone.trim(),
      infoConfirmed: draft.fulfillment.infoConfirmed,
      ...(draft.fulfillment.method === 'DELIVERY'
        ? {
            postalCode: draft.fulfillment.postalCode.trim(),
            addressLine1: draft.fulfillment.addressLine1.trim(),
            addressLine2: draft.fulfillment.addressLine2.trim(),
            deliveryMemo: draft.fulfillment.deliveryMemo.trim(),
          }
        : {}),
    },
  };
}
