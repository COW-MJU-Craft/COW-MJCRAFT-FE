import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminBuyerEmailEditor from './AdminBuyerEmailEditor';
import { adminOrdersApi } from '../../api/admin/orders';

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));

vi.mock('../confirm/useConfirm', () => ({
  useConfirm: () => ({ open: confirm }),
}));
vi.mock('../../api/admin/orders', () => ({
  adminOrdersApi: { updateBuyerEmail: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it('saves a corrected email after confirmation and refreshes the order detail', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrdersApi.updateBuyerEmail).mockResolvedValue(
    'corrected@mju.ac.kr',
  );
  const onSaved = vi.fn();

  render(
    <AdminBuyerEmailEditor
      orderId={12}
      initialEmail="typo@mju.ac.kr"
      onSaved={onSaved}
    />,
  );

  fireEvent.change(screen.getByLabelText('주문자 이메일 정정'), {
    target: { value: ' corrected@mju.ac.kr ' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장 및 재발송' }));

  await waitFor(() =>
    expect(adminOrdersApi.updateBuyerEmail).toHaveBeenCalledWith(
      12,
      'corrected@mju.ac.kr',
    ),
  );
  expect(onSaved).toHaveBeenCalledWith('corrected@mju.ac.kr');
  expect(screen.getByRole('status')).toHaveTextContent('새 주문 조회 링크를 발송');
});

it('retains the draft when the update request fails', async () => {
  confirm.mockResolvedValue(true);
  vi.mocked(adminOrdersApi.updateBuyerEmail).mockRejectedValue(
    new Error('network failed'),
  );

  render(
    <AdminBuyerEmailEditor
      orderId={12}
      initialEmail="typo@mju.ac.kr"
      onSaved={vi.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText('주문자 이메일 정정'), {
    target: { value: 'corrected@mju.ac.kr' },
  });
  fireEvent.click(screen.getByRole('button', { name: '저장 및 재발송' }));

  await screen.findByRole('alert');
  expect(screen.getByLabelText('주문자 이메일 정정')).toHaveValue(
    'corrected@mju.ac.kr',
  );
});

it('does not send an invalid email to the API', async () => {
  render(
    <AdminBuyerEmailEditor
      orderId={12}
      initialEmail="typo@mju.ac.kr"
      onSaved={vi.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText('주문자 이메일 정정'), {
    target: { value: 'invalid-email' },
  });
  fireEvent.submit(screen.getByRole('button', { name: '저장 및 재발송' }));

  expect(screen.getByRole('alert')).toHaveTextContent('올바른 이메일 주소');
  expect(adminOrdersApi.updateBuyerEmail).not.toHaveBeenCalled();
});
