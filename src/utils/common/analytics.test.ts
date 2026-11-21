import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GA4 command queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', 'G-TEST12345');
    delete window.gtag;
    delete window.dataLayer;
    document.getElementById('ga4-gtag-script')?.remove();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    delete window.dataLayer;
    document.getElementById('ga4-gtag-script')?.remove();
  });

  it('queues initialization and events in the arguments format consumed by Google tag', async () => {
    const { trackGA4PageView, trackGA4EcommerceEvent } = await import('./analytics');
    trackGA4PageView('/projects/45');
    trackGA4EcommerceEvent('add_to_cart', {
      items: [{ item_id: '1', item_name: 'Test item', price: 3500, quantity: 1 }],
      value: 3500,
    });

    const commands = window.dataLayer!;
    expect(commands).toHaveLength(4);
    for (const command of commands) {
      expect(Object.prototype.toString.call(command)).toBe('[object Arguments]');
      expect(Array.isArray(command)).toBe(false);
    }
    expect(Array.from(commands[1])).toEqual(['config', 'G-TEST12345', { send_page_view: false }]);
    expect(Array.from(commands[2])).toEqual([
      'event', 'page_view', expect.objectContaining({ page_path: '/projects/45' }),
    ]);
    expect(Array.from(commands[3])).toEqual([
      'event', 'add_to_cart', expect.objectContaining({ currency: 'KRW', value: 3500 }),
    ]);
    expect(document.querySelectorAll('#ga4-gtag-script')).toHaveLength(1);
  });

  it('does not inject or queue commands without a measurement ID', async () => {
    vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '');
    const { trackGA4PageView } = await import('./analytics');
    trackGA4PageView('/');
    expect(window.dataLayer).toBeUndefined();
    expect(document.getElementById('ga4-gtag-script')).toBeNull();
  });
});
