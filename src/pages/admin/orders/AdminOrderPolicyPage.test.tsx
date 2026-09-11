import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { adminOrderPolicyApi } from '../../../api/admin/orderPolicy';
import { ApiError } from '../../../api/core/client';
import AdminOrderPolicyPage from './AdminOrderPolicyPage';

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('../../../components/confirm/useConfirm', () => ({ useConfirm: () => ({ open: confirm }) }));
vi.mock('../../../api/admin/orderPolicy', async (original) => ({
  ...await original<typeof import('../../../api/admin/orderPolicy')>(),
  adminOrderPolicyApi: { get: vi.fn(), update: vi.fn() },
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(adminOrderPolicyApi.get).mockResolvedValue({ id: 1, defaultShippingFee: 3500 });
});
afterEach(cleanup);

function setup() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
    <MemoryRouter><AdminOrderPolicyPage /></MemoryRouter>
  </QueryClientProvider>);
}

it('shows the server fee and blocks unchanged or invalid values', async () => {
  setup();
  const input = await screen.findByLabelText('변경할 기본 배송비');
  expect(input).toHaveValue('3500');
  expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  fireEvent.change(input, { target: { value: '' } });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
});

it('confirms zero, saves, and reloads the policy', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrderPolicyApi.update).mockResolvedValue({ id: 1, defaultShippingFee: 0 });
  setup();
  fireEvent.change(await screen.findByLabelText('변경할 기본 배송비'), { target: { value: '0' } });
  vi.mocked(adminOrderPolicyApi.get).mockResolvedValue({ id: 1, defaultShippingFee: 0 });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('기본 배송비를 저장했습니다.');
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ description: '3,500원 → 0원으로 변경할까요?' }));
  expect(adminOrderPolicyApi.update).toHaveBeenCalledWith(0);
  expect(adminOrderPolicyApi.get).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('변경할 기본 배송비')).toHaveValue('0');
});

it('does not update when confirmation is canceled', async () => {
  confirm.mockResolvedValue(false);
  setup();
  fireEvent.change(await screen.findByLabelText('변경할 기본 배송비'), { target: { value: '4000' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
  expect(adminOrderPolicyApi.update).not.toHaveBeenCalled();
});

it('preserves the draft on failure', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrderPolicyApi.update).mockRejectedValue(new Error('offline'));
  setup();
  fireEvent.change(await screen.findByLabelText('변경할 기본 배송비'), { target: { value: '4000' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('변경할 기본 배송비')).toHaveValue('4000');
});

it('allows another save when the post-save refresh fails with cached policy data', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrderPolicyApi.get)
    .mockResolvedValueOnce({ id: 1, defaultShippingFee: 3500 })
    .mockRejectedValueOnce(new Error('refresh failed'));
  vi.mocked(adminOrderPolicyApi.update).mockResolvedValue({ id: 1, defaultShippingFee: 4000 });
  setup();
  const input = await screen.findByLabelText('변경할 기본 배송비');
  fireEvent.change(input, { target: { value: '4000' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('저장은 완료됐지만 최신 정책 재조회에 실패했습니다. 새로고침해주세요.');

  fireEvent.change(input, { target: { value: '4500' } });
  expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
});

it('does not invent a default when the policy is missing', async () => {
  vi.mocked(adminOrderPolicyApi.get).mockRejectedValue(new ApiError(404, null));
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent('주문 정책이 등록되지 않았습니다.');
  expect(screen.queryByLabelText('변경할 기본 배송비')).not.toBeInTheDocument();
});

it('blocks duplicate requests during save', async () => {
  confirm.mockResolvedValue(true);
  let resolve!: (value: { id: number; defaultShippingFee: number }) => void;
  vi.mocked(adminOrderPolicyApi.update).mockReturnValue(new Promise((done) => { resolve = done; }));
  setup();
  const input = await screen.findByLabelText('변경할 기본 배송비');
  fireEvent.change(input, { target: { value: '4000' } });
  fireEvent.submit(input.closest('form')!);
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(adminOrderPolicyApi.update).toHaveBeenCalledTimes(1));
  resolve({ id: 1, defaultShippingFee: 4000 });
  await screen.findByText('기본 배송비를 저장했습니다.');
});
