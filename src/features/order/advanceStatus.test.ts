import { describe, expect, it } from 'vitest';
import { canAdvanceTogether, nextOrderStatus } from './advanceStatus';

describe('order advancement eligibility', () => {
  it.each([
    ['PENDING_DEPOSIT', 'PAID'], ['PAID', 'IN_PRODUCTION'],
    ['IN_PRODUCTION', 'READY_TO_SHIP'], ['READY_TO_SHIP', 'DELIVERED'],
  ])('offers the next state for %s', (status, next) => expect(nextOrderStatus(status)).toBe(next));
  it.each(['DELIVERED', 'CANCELED', 'REFUNDED', 'REFUND_REQUESTED', 'UNKNOWN'])('blocks %s', (status) => {
    expect(canAdvanceTogether([status])).toBe(false);
  });
  it('rejects empty, mixed, and oversized selections', () => {
    expect(canAdvanceTogether([])).toBe(false);
    expect(canAdvanceTogether(['PAID', 'PENDING_DEPOSIT'])).toBe(false);
    expect(canAdvanceTogether(Array(201).fill('PAID'))).toBe(false);
    expect(canAdvanceTogether(Array(200).fill('PAID'))).toBe(true);
  });
});
