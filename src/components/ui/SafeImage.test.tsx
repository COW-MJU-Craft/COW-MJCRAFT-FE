import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SafeImage from './SafeImage';

afterEach(cleanup);

it('이미지가 정상이면 img를 그대로 렌더링한다', () => {
  render(<SafeImage src="/a.webp" alt="사진" className="h-10 w-10" />);

  const img = screen.getByRole('img', { name: '사진' });
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('src', '/a.webp');
  expect(screen.queryByText('이미지를 불러오지 못했어요')).toBeNull();
});

it('로드에 실패하면 안내 문구와 접근성 이름을 보여준다', () => {
  render(<SafeImage src="/broken.webp" alt="입학키트" className="h-64 w-full" />);

  fireEvent.error(screen.getByRole('img', { name: '입학키트' }));

  expect(screen.getByText('이미지를 불러오지 못했어요')).toBeInTheDocument();
  const fallback = screen.getByRole('img', {
    name: '입학키트 (이미지를 불러오지 못했어요)',
  });
  expect(fallback.tagName).toBe('DIV');
  expect(fallback).toHaveClass('h-64', 'w-full');
});

it('compact면 문구 없이 아이콘만 보여준다', () => {
  render(<SafeImage src="/broken.webp" alt="썸네일" compact className="h-8 w-8" />);

  fireEvent.error(screen.getByRole('img', { name: '썸네일' }));

  expect(screen.queryByText('이미지를 불러오지 못했어요')).toBeNull();
  expect(
    screen.getByRole('img', { name: '썸네일 (이미지를 불러오지 못했어요)' }),
  ).toBeInTheDocument();
});

it('fallbackText로 문구를 바꿀 수 있다', () => {
  render(<SafeImage src="/broken.webp" alt="로고" fallbackText="로고 없음" />);

  fireEvent.error(screen.getByRole('img', { name: '로고' }));

  expect(screen.getByText('로고 없음')).toBeInTheDocument();
});

it('호출한 쪽의 onError도 함께 실행한다', () => {
  const onError = vi.fn();
  render(<SafeImage src="/broken.webp" alt="사진" onError={onError} />);

  fireEvent.error(screen.getByRole('img', { name: '사진' }));

  expect(onError).toHaveBeenCalledTimes(1);
});

it('src가 바뀌면 다시 이미지를 시도한다', () => {
  const { rerender } = render(<SafeImage src="/broken.webp" alt="사진" />);
  fireEvent.error(screen.getByRole('img', { name: '사진' }));
  expect(screen.getByText('이미지를 불러오지 못했어요')).toBeInTheDocument();

  rerender(<SafeImage src="/fixed.webp" alt="사진" />);

  const img = screen.getByRole('img', { name: '사진' });
  expect(img.tagName).toBe('IMG');
  expect(img).toHaveAttribute('src', '/fixed.webp');
});
