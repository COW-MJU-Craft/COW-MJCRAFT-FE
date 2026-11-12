// 관리자가 고른 이미지를 업로드 전에 브라우저에서 WebP로 줄인다.
//
// 반드시 "파일을 고른 시점"(presign 요청 전)에 호출해야 한다. 서명된 업로드 URL(presigned PUT)이
// Content-Type까지 서명에 포함하므로, presign 이후 업로드 시점에 형식을 바꾸면 403이 난다.
// 변환된 File은 이름 확장자와 type이 모두 webp라서 이후 흐름(presign → 업로드)은 그대로 동작한다.
//
// - 대상: JPEG / PNG / WebP. GIF(애니메이션)·SVG·그 외 파일은 건드리지 않는다.
// - 긴 변이 MAX_IMAGE_EDGE를 넘으면 비율을 유지해 줄인다.
// - fail-open: 변환 결과가 없거나, 원본보다 크거나, 브라우저가 WebP로 인코딩하지 못하면
//   (Safari/Firefox 등) 원본 File을 그대로 돌려준다. 변환 실패가 업로드 실패가 되면 안 된다.

export const MAX_IMAGE_EDGE = 1920;
export const WEBP_QUALITY = 0.9;
// 이 크기 이하이고 해상도도 충분히 작으면 다시 인코딩하지 않는다(작은 로고·아이콘의 화질 보호).
export const SKIP_BELOW_BYTES = 100 * 1024;

const OPTIMIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isOptimizableImageType(contentType: string): boolean {
  return OPTIMIZABLE_TYPES.has(contentType.trim().toLowerCase());
}

export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function toWebpFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${base}.webp`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImageFile(file: File): Promise<File> {
  if (!isOptimizableImageType(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const target = computeTargetSize(bitmap.width, bitmap.height);
      const needsResize =
        target.width !== bitmap.width || target.height !== bitmap.height;
      if (!needsResize && file.size <= SKIP_BELOW_BYTES) return file;

      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, target.width, target.height);

      const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
      if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) {
        return file;
      }
      return new File([blob], toWebpFileName(file.name), {
        type: 'image/webp',
        lastModified: file.lastModified,
      });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}

// 큰 이미지를 한꺼번에 디코딩하면 메모리를 많이 쓰므로(4000x3000 ≈ 48MB) 순서대로 처리한다.
export async function prepareImageFiles(files: File[]): Promise<File[]> {
  const result: File[] = [];
  for (const file of files) {
    result.push(await prepareImageFile(file));
  }
  return result;
}
