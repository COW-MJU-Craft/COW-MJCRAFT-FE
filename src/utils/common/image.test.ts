import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeTargetSize,
  isOptimizableImageType,
  prepareImageFile,
  prepareImageFiles,
  toWebpFileName,
} from './image';

function fakeFile(size: number, type: string, name = 'photo.png') {
  return new File([new Uint8Array(size)], name, { type });
}

function stubImage(width: number, height: number) {
  const close = vi.fn();
  const decode = vi.fn().mockResolvedValue({ width, height, close });
  vi.stubGlobal('createImageBitmap', decode);
  return { close, decode };
}

function stubCanvas(output: Blob | null) {
  const drawImage = vi.fn();
  const toBlob = vi.fn((cb: (b: Blob | null) => void) => cb(output));
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
  vi.spyOn(document, 'createElement').mockReturnValue(
    canvas as unknown as HTMLCanvasElement,
  );
  return { canvas, drawImage, toBlob };
}

function webp(size: number) {
  return new Blob([new Uint8Array(size)], { type: 'image/webp' });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('computeTargetSize', () => {
  it('긴 변이 한도 이하면 그대로 둔다', () => {
    expect(computeTargetSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });

  it('가로가 길면 가로를 한도에 맞추고 비율을 유지한다', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1920, height: 1440 });
  });

  it('세로가 길면 세로를 한도에 맞춘다', () => {
    expect(computeTargetSize(1000, 4000)).toEqual({ width: 480, height: 1920 });
  });

  it('극단적인 비율에서도 0px이 되지 않는다', () => {
    expect(computeTargetSize(100000, 10).height).toBeGreaterThanOrEqual(1);
  });
});

describe('isOptimizableImageType', () => {
  it('JPEG/PNG/WebP만 대상이다 (대소문자·공백 무시)', () => {
    expect(isOptimizableImageType(' IMAGE/PNG ')).toBe(true);
    expect(isOptimizableImageType('image/jpeg')).toBe(true);
    expect(isOptimizableImageType('image/webp')).toBe(true);
  });

  it('GIF·SVG·문서는 대상이 아니다', () => {
    expect(isOptimizableImageType('image/gif')).toBe(false);
    expect(isOptimizableImageType('image/svg+xml')).toBe(false);
    expect(isOptimizableImageType('application/pdf')).toBe(false);
  });
});

describe('toWebpFileName', () => {
  it('마지막 확장자만 webp로 바꾼다', () => {
    expect(toWebpFileName('photo.png')).toBe('photo.webp');
    expect(toWebpFileName('my.final.JPG')).toBe('my.final.webp');
  });

  it('확장자가 없거나 점으로 시작하면 .webp를 붙인다', () => {
    expect(toWebpFileName('photo')).toBe('photo.webp');
    expect(toWebpFileName('.hidden')).toBe('.hidden.webp');
  });
});

describe('prepareImageFile', () => {
  it('큰 PNG를 한도에 맞게 줄여 .webp 이름과 image/webp 타입의 File로 바꾼다', async () => {
    const { close } = stubImage(4000, 3000);
    const { canvas, drawImage, toBlob } = stubCanvas(webp(200_000));
    const original = fakeFile(3_000_000, 'image/png', 'cover.png');

    const result = await prepareImageFile(original);

    expect(result).not.toBe(original);
    expect(result.name).toBe('cover.webp');
    expect(result.type).toBe('image/webp');
    expect(result.size).toBe(200_000);
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1440);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1920, 1440);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);
    expect(close).toHaveBeenCalled();
  });

  it('해상도는 작지만 용량이 큰 JPEG도 WebP로 다시 인코딩한다', async () => {
    stubImage(1080, 1350);
    stubCanvas(webp(150_000));
    const original = fakeFile(1_300_000, 'image/jpeg', 'a.jpg');

    const result = await prepareImageFile(original);

    expect(result.name).toBe('a.webp');
    expect(result.type).toBe('image/webp');
  });

  it('이미 작고 해상도도 낮으면 디코딩 결과만 보고 원본을 반환한다', async () => {
    stubImage(800, 600);
    const { drawImage } = stubCanvas(webp(1));
    const original = fakeFile(50_000, 'image/png');

    expect(await prepareImageFile(original)).toBe(original);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('GIF·SVG 같은 비대상은 디코딩 없이 원본을 반환한다', async () => {
    const { decode } = stubImage(10, 10);
    const gif = fakeFile(5_000_000, 'image/gif', 'a.gif');

    expect(await prepareImageFile(gif)).toBe(gif);
    expect(decode).not.toHaveBeenCalled();
  });

  it('변환 결과가 원본보다 크면 원본을 반환한다', async () => {
    stubImage(1920, 1080);
    stubCanvas(webp(900_000));
    const original = fakeFile(500_000, 'image/png');

    expect(await prepareImageFile(original)).toBe(original);
  });

  it('브라우저가 WebP로 인코딩하지 못하면(PNG로 폴백) 원본을 반환한다', async () => {
    stubImage(4000, 3000);
    stubCanvas(new Blob([new Uint8Array(100)], { type: 'image/png' }));
    const original = fakeFile(3_000_000, 'image/jpeg');

    expect(await prepareImageFile(original)).toBe(original);
  });

  it('인코딩 결과가 null이어도 원본을 반환한다', async () => {
    stubImage(4000, 3000);
    stubCanvas(null);
    const original = fakeFile(3_000_000, 'image/jpeg');

    expect(await prepareImageFile(original)).toBe(original);
  });

  it('디코딩 중 오류가 나면 업로드를 막지 않고 원본을 반환한다', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
    const original = fakeFile(3_000_000, 'image/jpeg');

    expect(await prepareImageFile(original)).toBe(original);
  });
});

describe('prepareImageFiles', () => {
  it('순서를 유지하고 변환 대상이 아닌 파일은 그대로 둔다', async () => {
    stubImage(4000, 3000);
    stubCanvas(webp(100_000));
    const png = fakeFile(3_000_000, 'image/png', 'one.png');
    const pdf = fakeFile(1000, 'application/pdf', 'two.pdf');

    const result = await prepareImageFiles([png, pdf]);

    expect(result.map((f) => f.name)).toEqual(['one.webp', 'two.pdf']);
    expect(result[1]).toBe(pdf);
  });

  it('빈 배열은 빈 배열을 반환한다', async () => {
    expect(await prepareImageFiles([])).toEqual([]);
  });
});
