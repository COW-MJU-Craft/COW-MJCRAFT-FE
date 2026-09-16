import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { adminItemsApi } from './items';

vi.mock('../core/client', () => ({
  api: vi.fn(),
  withApiBase: (path: string) => path,
}));

beforeEach(() => vi.resetAllMocks());

it('creates an option group with its required flag and sort order', async () => {
  await adminItemsApi.createOptionGroup('15', {
    name: '색상',
    required: true,
    sortOrder: 0,
  });

  expect(api).toHaveBeenCalledWith('/admin/items/15/option-groups', {
    method: 'POST',
    body: { name: '색상', required: true, sortOrder: 0 },
  });
});

it('updates an option value including its price and stock', async () => {
  await adminItemsApi.updateOptionValue('15', 4, 9, {
    name: '네이비',
    additionalPrice: 500,
    stockQty: 7,
    sortOrder: 1,
  });

  expect(api).toHaveBeenCalledWith(
    '/admin/items/15/option-groups/4/values/9',
    {
      method: 'PUT',
      body: {
        name: '네이비',
        additionalPrice: 500,
        stockQty: 7,
        sortOrder: 1,
      },
    },
  );
});

it('deletes only the selected option value', async () => {
  await adminItemsApi.deleteOptionValue('15', 4, 9);

  expect(api).toHaveBeenCalledWith(
    '/admin/items/15/option-groups/4/values/9',
    { method: 'DELETE' },
  );
});
