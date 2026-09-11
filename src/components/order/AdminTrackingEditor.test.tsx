import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminTrackingEditor from './AdminTrackingEditor';
import { adminOrdersApi } from '../../api/admin/orders';

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('../confirm/useConfirm', () => ({ useConfirm: () => ({ open: confirm }) }));
vi.mock('../../api/admin/orders', () => ({ adminOrdersApi: { updateTrackingInformation: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('retains input when saving fails', async () => {
  vi.mocked(adminOrdersApi.updateTrackingInformation).mockRejectedValue(new Error('offline'));
  render(<AdminTrackingEditor projectId={1} orderId={2} initialValue={null} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('운송장 정보'), { target: { value: 'CJ 123' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('운송장 정보')).toHaveValue('CJ 123');
});

it('does not delete after cancellation', async () => {
  confirm.mockResolvedValue(false);
  render(<AdminTrackingEditor projectId={1} orderId={2} initialValue="CJ 123" onSaved={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '삭제' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled());
  expect(adminOrdersApi.updateTrackingInformation).not.toHaveBeenCalled();
});

it('updates the detail after confirmed deletion', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrdersApi.updateTrackingInformation).mockResolvedValue({ orderId: 2, trackingInformation: null });
  const saved = vi.fn();
  render(<AdminTrackingEditor projectId={1} orderId={2} initialValue="CJ 123" onSaved={saved} />);
  fireEvent.click(screen.getByRole('button', { name: '삭제' }));
  await waitFor(() => expect(saved).toHaveBeenCalledWith(null));
  expect(adminOrdersApi.updateTrackingInformation).toHaveBeenCalledWith(1, 2, null);
});

it('blocks duplicate submits and ignores a response after switching orders', async () => {
  let resolve!: (value: { orderId: number; trackingInformation: string }) => void;
  vi.mocked(adminOrdersApi.updateTrackingInformation).mockReturnValue(new Promise((done) => { resolve = done; }));
  const saved = vi.fn();
  const view = render(<AdminTrackingEditor key="2" projectId={1} orderId={2} initialValue={null} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText('운송장 정보'), { target: { value: 'CJ 123' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  fireEvent.click(screen.getByRole('button', { name: '저장 중...' }));
  expect(adminOrdersApi.updateTrackingInformation).toHaveBeenCalledTimes(1);
  view.rerender(<AdminTrackingEditor key="3" projectId={1} orderId={3} initialValue="OTHER" onSaved={saved} />);
  resolve({ orderId: 2, trackingInformation: 'CJ 123' });
  await waitFor(() => expect(screen.getByLabelText('운송장 정보')).toHaveValue('OTHER'));
  expect(saved).not.toHaveBeenCalled();
});
