import { StrictMode } from 'react';
import { cleanup, render, act, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackGA4PageView } from '../../utils/common/analytics';
import GoogleAnalytics from './GoogleAnalytics';

vi.mock('../../utils/common/analytics', () => ({ trackGA4PageView: vi.fn() }));

let frames: Map<number, FrameRequestCallback>;

function Navigation() {
  const navigate = useNavigate();
  return <>
    <button onClick={() => navigate('/about')}>About</button>
    <button onClick={() => navigate('/projects/45?utm_source=instagram')}>Project</button>
    <button onClick={() => navigate('/admin/projects')}>Admin</button>
  </>;
}

function flushFrames() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (frameId: number) => frames.delete(frameId));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('tracks the first visit once after StrictMode cancels and re-runs the effect', () => {
  render(<StrictMode><MemoryRouter><GoogleAnalytics /></MemoryRouter></StrictMode>);
  flushFrames();
  expect(trackGA4PageView).toHaveBeenCalledExactlyOnceWith('/');
});

it('tracks SPA navigation, skips admin routes, and cancels superseded visits', () => {
  render(<MemoryRouter><GoogleAnalytics /><Navigation /></MemoryRouter>);
  flushFrames();
  fireEvent.click(screen.getByText('About'));
  fireEvent.click(screen.getByText('Project'));
  flushFrames();
  fireEvent.click(screen.getByText('Admin'));
  flushFrames();
  expect(vi.mocked(trackGA4PageView).mock.calls).toEqual([
    ['/'], ['/projects/45?utm_source=instagram'],
  ]);
});
