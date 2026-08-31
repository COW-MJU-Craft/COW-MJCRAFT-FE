import type { OrderCreateRequest } from '../../api/orders';
import type { OrderDraft } from './types';

function toOrderItemsPayload(draft: OrderDraft): OrderCreateRequest['items'] {
  const aggregatedItems = draft.items.reduce<Record<number, number>>(
    (acc, item) => {
      const projectItemId = Number(item.itemId);
      if (!Number.isFinite(projectItemId)) return acc;
      const quantity = Number.isFinite(item.quantity)
        ? Math.max(1, item.quantity)
        : 1;
      acc[projectItemId] = (acc[projectItemId] ?? 0) + quantity;
      return acc;
    },
    {},
  );

  return Object.entries(aggregatedItems).map(([projectItemId, quantity]) => ({
    projectItemId: Number(projectItemId),
    quantity,
  }));
}

export function buildOrderCreatePayload(
  draft: OrderDraft,
): OrderCreateRequest | null {
  const items = toOrderItemsPayload(draft);
  if (items.length === 0) return null;

  return {
    lookupId: draft.lookup.lookupId.trim(),
    password: draft.lookup.password,
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
      email: draft.buyer.email.trim(),
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
