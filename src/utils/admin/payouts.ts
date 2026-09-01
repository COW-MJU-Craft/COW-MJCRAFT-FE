import type { PayoutReport } from '../../types/payouts';
import { payoutReports } from '../../data/payouts';

const STORAGE_KEY = 'cow_admin_payouts_v1';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadAdminPayouts(): PayoutReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return payoutReports;
    const parsed = JSON.parse(raw) as PayoutReport[];
    return Array.isArray(parsed) ? parsed : payoutReports;
  } catch {
    return payoutReports;
  }
}

export function saveAdminPayouts(next: PayoutReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function createPayoutReport(): PayoutReport {
  return {
    id: createId('payout'),
    term: '',
    projectTitle: '',
    sales: [],
    expenseGroups: [],
  };
}
