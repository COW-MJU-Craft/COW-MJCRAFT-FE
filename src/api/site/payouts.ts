import { api, withApiBase } from '../core/client';
import type { ExpenseGroup, MoneyItem, PayoutReport } from '../../types/payouts';

const USER_PAYOUTS_PATH = '/payouts';
const ADMIN_PAYOUTS_PATH = '/admin/payouts';

export function getItemTotal(item: MoneyItem) {
  if (item.unitPrice !== undefined || item.quantity !== undefined) {
    const unitPrice = item.unitPrice ?? 0;
    const quantity = item.quantity ?? 0;
    return unitPrice * quantity;
  }
  return item.amount;
}

export function sumItems(items: MoneyItem[]) {
  return items.reduce((acc, it) => acc + getItemTotal(it), 0);
}

export function sumExpenses(groups: ExpenseGroup[]) {
  return groups.reduce((acc, g) => acc + sumItems(g.items), 0);
}

export function calcReport(r: PayoutReport) {
  const salesTotal = sumItems(r.sales);
  const expenseTotal = sumExpenses(r.expenseGroups);
  const profit = salesTotal - expenseTotal;
  const profitRate = salesTotal === 0 ? 0 : (profit / salesTotal) * 100;
  return { salesTotal, expenseTotal, profit, profitRate };
}

type AnyRecord = Record<string, unknown>;

function unwrapData(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const r = raw as AnyRecord;
  if ('data' in r) return r.data;
  return raw;
}

function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): AnyRecord {
  return (v ?? {}) as AnyRecord;
}

function normalizeList(raw: unknown): AnyRecord[] {
  const payload = unwrapData(raw);
  if (Array.isArray(payload)) return payload as AnyRecord[];

  if (payload && typeof payload === 'object') {
    const r = payload as AnyRecord;
    const items = r.payouts ?? r.items ?? r.results ?? r.list;
    if (Array.isArray(items)) return items as AnyRecord[];
  }

  return [];
}

function mapMoneyItem(v: unknown, fallbackCategory?: string): MoneyItem {
  const r = asRecord(v);
  const rawAmount = toNum(r.amount ?? r.total ?? r.value) ?? 0;

  return {
    id: toStr(r.payoutItemId ?? r.itemId ?? r.id) ?? undefined,
    label: toStr(r.name ?? r.label ?? r.title ?? r.itemName) ?? '항목',
    amount: rawAmount,
    category: toStr(r.category) ?? fallbackCategory,
  };
}

function mapSales(dto: AnyRecord): MoneyItem[] {
  const raw = dto.incomes ?? dto.sales ?? dto.incomeItems;
  return toArray(raw).map((it) => mapMoneyItem(it));
}

function mapExpenseGroups(dto: AnyRecord): ExpenseGroup[] {
  const groupRaw = dto.expenseGroups;
  if (Array.isArray(groupRaw)) {
    return groupRaw.map((g) => {
      const gr = asRecord(g);
      const title = toStr(gr.category ?? gr.title ?? gr.name) ?? '지출';
      return {
        title,
        items: toArray(gr.items).map((it) => mapMoneyItem(it, title)),
      };
    });
  }

  const flat = toArray(dto.expenses ?? dto.expenseItems);
  if (flat.length === 0) return [];

  const grouped = new Map<string, MoneyItem[]>();
  flat.forEach((it) => {
    const item = mapMoneyItem(it);
    const key = item.category ?? '기타';
    const arr = grouped.get(key) ?? [];
    arr.push(item);
    grouped.set(key, arr);
  });

  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}

function mapReportDto(v: unknown): PayoutReport {
  const dto = asRecord(v);
  return {
    id: toStr(dto.payoutId ?? dto.id ?? dto.reportId) ?? `tmp_${Date.now()}`,
    term: toStr(dto.semester ?? dto.term) ?? '',
    projectTitle: toStr(dto.title ?? dto.projectTitle ?? dto.projectName) ?? '',
    projectId: toStr(dto.projectId) ?? undefined,
    sales: mapSales(dto),
    expenseGroups: mapExpenseGroups(dto),
    footerNote: toStr(dto.footerNote ?? dto.note) ?? undefined,
    instaHandle: toStr(dto.instaHandle ?? dto.handle) ?? undefined,
  };
}

async function fetchUserDetailById(id: string) {
  const raw = await api<unknown>(withApiBase(`${USER_PAYOUTS_PATH}/${id}`));
  return mapReportDto(unwrapData(raw));
}

async function fetchAdminDetailById(id: string) {
  const raw = await api<unknown>(withApiBase(`${ADMIN_PAYOUTS_PATH}/${id}`));
  return mapReportDto(unwrapData(raw));
}

function isTemporaryId(id: string) {
  return id.startsWith('tmp_');
}

function flattenItems(report: PayoutReport): Array<{
  type: 'INCOME' | 'EXPENSE';
  category?: string;
  item: MoneyItem;
}> {
  const income = report.sales.map((item) => ({
    type: 'INCOME' as const,
    item,
  }));

  const expense = report.expenseGroups.flatMap((g) =>
    g.items.map((item) => ({
      type: 'EXPENSE' as const,
      category: g.title,
      item,
    })),
  );

  return [...income, ...expense];
}

function collectExistingItemIds(report: PayoutReport): string[] {
  const ids: string[] = [];
  report.sales.forEach((it) => {
    if (it.id != null) ids.push(String(it.id));
  });
  report.expenseGroups.forEach((g) =>
    g.items.forEach((it) => {
      if (it.id != null) ids.push(String(it.id));
    }),
  );
  return ids;
}

function getValidatedProjectId(report: PayoutReport): number {
  const n = Number(report.projectId);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('정산 저장 시 프로젝트 선택은 필수입니다.');
  }
  return n;
}

export const payoutsApi = {
  async list(): Promise<PayoutReport[]> {
    const raw = await api<unknown>(withApiBase(USER_PAYOUTS_PATH));
    const list = normalizeList(raw).map(mapReportDto);

    const enriched = await Promise.all(
      list.map(async (r) => {
        const hasDetail = r.sales.length > 0 || r.expenseGroups.length > 0;
        if (hasDetail) return r;
        try {
          return await fetchUserDetailById(r.id);
        } catch {
          return r;
        }
      }),
    );

    return enriched;
  },

  async getByProjectId(projectId: string): Promise<PayoutReport> {
    const raw = await api<unknown>(
      withApiBase(`/projects/${projectId}/payout`),
    );
    return mapReportDto(unwrapData(raw));
  },
};

export const payoutsAdminApi = {
  async list(): Promise<PayoutReport[]> {
    const raw = await api<unknown>(withApiBase(ADMIN_PAYOUTS_PATH));
    const base = normalizeList(raw).map(mapReportDto);

    const enriched = await Promise.all(
      base.map(async (r) => {
        try {
          return await fetchAdminDetailById(r.id);
        } catch {
          return r;
        }
      }),
    );

    return enriched;
  },

  async remove(reportId: string) {
    await api<void>(withApiBase(`${ADMIN_PAYOUTS_PATH}/${reportId}`), {
      method: 'DELETE',
    });
  },

  async save(report: PayoutReport): Promise<PayoutReport> {
    const projectId = getValidatedProjectId(report);

    const metaBody = {
      title: report.projectTitle,
      semester: report.term,
      projectId,
    };

    let reportId = report.id;

    if (isTemporaryId(reportId)) {
      const createdRaw = await api<unknown>(withApiBase(ADMIN_PAYOUTS_PATH), {
        method: 'POST',
        body: metaBody,
      });

      const createdData = asRecord(unwrapData(createdRaw));
      const createdId =
        toStr(createdData.payoutId ?? createdData.id) ?? reportId;
      reportId = createdId;
    } else {
      await api<void>(withApiBase(`${ADMIN_PAYOUTS_PATH}/${reportId}`), {
        method: 'PUT',
        body: metaBody,
      });
    }

    try {
      const current = await fetchAdminDetailById(reportId);
      const itemIds = collectExistingItemIds(current);

      await Promise.all(
        itemIds.map((itemId) =>
          api<void>(
            withApiBase(`${ADMIN_PAYOUTS_PATH}/${reportId}/items/${itemId}`),
            {
              method: 'DELETE',
            },
          ),
        ),
      );
    } catch {
      // 상세 조회 실패 시 삭제 스킵
    }

    const items = flattenItems(report);
    for (const entry of items) {
      const { item, type, category } = entry;
      await api<void>(withApiBase(`${ADMIN_PAYOUTS_PATH}/${reportId}/items`), {
        method: 'POST',
        body: {
          type,
          name: item.label,
          amount: item.amount ?? 0,
          category: type === 'EXPENSE' ? (category ?? '기타') : null,
        },
      });
    }

    try {
      return await fetchAdminDetailById(reportId);
    } catch {
      return { ...report, id: reportId, projectId: String(projectId) };
    }
  },
};

export type { PayoutReport };
