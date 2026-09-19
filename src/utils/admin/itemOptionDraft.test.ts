import { describe, expect, it, vi } from 'vitest';
import {
  pruneOptionDrafts,
  saveOptionDrafts,
  validateOptionDrafts,
  type OptionGroupDraft,
  type OptionSaveApi,
} from './itemOptionDraft';

const value = (name: string, additionalPrice = '0', stockQty = '') => ({
  key: `v-${name}`,
  name,
  additionalPrice,
  stockQty,
});
const group = (
  name: string,
  values: OptionGroupDraft['values'],
  required = true,
): OptionGroupDraft => ({ key: `g-${name}`, name, required, values });

function createApi(): OptionSaveApi {
  let nextId = 100;
  return {
    createOptionGroup: vi.fn(async () => ({ id: nextId++ })),
    createOptionValue: vi.fn(async () => ({})),
  };
}

describe('pruneOptionDrafts', () => {
  it('drops untouched groups and blank values', () => {
    const result = pruneOptionDrafts([
      group('', [value('')]),
      group('색상', [value('블랙'), value('')]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].values.map((v) => v.name)).toEqual(['블랙']);
  });
});

describe('validateOptionDrafts', () => {
  it('accepts no options at all', () => {
    expect(validateOptionDrafts([group('', [value('')])])).toBeNull();
  });

  it('rejects a group without a name', () => {
    expect(validateOptionDrafts([group('', [value('S')])])).toMatch(
      '그룹명',
    );
  });

  it('rejects a named group without values', () => {
    expect(validateOptionDrafts([group('사이즈', [value('')])])).toMatch(
      '옵션값',
    );
  });

  it('rejects negative price and stock', () => {
    expect(
      validateOptionDrafts([group('사이즈', [value('S', '-1')])]),
    ).toMatch('0 이상');
    expect(
      validateOptionDrafts([group('사이즈', [value('S', '0', '-3')])]),
    ).toMatch('0 이상');
  });
});

describe('saveOptionDrafts', () => {
  it('creates groups then values in order with sortOrder and unlimited stock as null', async () => {
    const api = createApi();
    const result = await saveOptionDrafts(api, '7', [
      group('색상', [value('블랙', '500', '10'), value('화이트')], false),
      group('사이즈', [value('M')]),
    ]);

    expect(result).toEqual({ ok: true });
    expect(api.createOptionGroup).toHaveBeenNthCalledWith(1, '7', {
      name: '색상',
      required: false,
      sortOrder: 0,
    });
    expect(api.createOptionGroup).toHaveBeenNthCalledWith(2, '7', {
      name: '사이즈',
      required: true,
      sortOrder: 1,
    });
    expect(api.createOptionValue).toHaveBeenNthCalledWith(1, '7', 100, {
      name: '블랙',
      additionalPrice: 500,
      stockQty: 10,
      sortOrder: 0,
    });
    expect(api.createOptionValue).toHaveBeenNthCalledWith(2, '7', 100, {
      name: '화이트',
      additionalPrice: 0,
      stockQty: null,
      sortOrder: 1,
    });
    expect(api.createOptionValue).toHaveBeenNthCalledWith(3, '7', 101, {
      name: 'M',
      additionalPrice: 0,
      stockQty: null,
      sortOrder: 0,
    });
  });

  it('makes no calls when there are no options', async () => {
    const api = createApi();
    expect(await saveOptionDrafts(api, '7', [group('', [value('')])])).toEqual({
      ok: true,
    });
    expect(api.createOptionGroup).not.toHaveBeenCalled();
  });

  it('stops at the first failing value and reports it', async () => {
    const api = createApi();
    vi.mocked(api.createOptionValue)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('duplicate'));

    const result = await saveOptionDrafts(api, '7', [
      group('색상', [value('블랙'), value('화이트'), value('레드')]),
      group('사이즈', [value('M')]),
    ]);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('화이트');
    expect(api.createOptionValue).toHaveBeenCalledTimes(2);
    expect(api.createOptionGroup).toHaveBeenCalledTimes(1);
  });

  it('stops when a group fails to create', async () => {
    const api = createApi();
    vi.mocked(api.createOptionGroup).mockRejectedValueOnce(new Error('boom'));
    const result = await saveOptionDrafts(api, '7', [
      group('색상', [value('블랙')]),
    ]);
    expect(result.ok).toBe(false);
    expect(api.createOptionValue).not.toHaveBeenCalled();
  });
});
