import { useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** 로드에 실패했을 때 보여줄 문구 */
  fallbackText?: string;
  /** 작은 썸네일용: 문구 없이 아이콘만 보여준다 */
  compact?: boolean;
};

// 이미지를 불러오지 못했을 때(네트워크·DNS·만료 등) 빈 칸 대신 안내를 보여준다.
// <img>의 모든 속성을 그대로 받으며, 로드에 실패하면 같은 className의 영역에 안내를 렌더링한다.
export default function SafeImage({
  fallbackText = '이미지를 불러오지 못했어요',
  compact = false,
  className = '',
  src,
  alt,
  onError,
  ...rest
}: SafeImageProps) {
  // src가 바뀌면 다시 시도할 수 있도록 실패한 src를 기억해서 비교한다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src) && failedSrc === src;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} (이미지를 불러오지 못했어요)` : fallbackText}
        className={`${className} flex flex-col items-center justify-center gap-1 overflow-hidden bg-slate-100 px-2 text-center text-xs font-semibold text-slate-400`}
      >
        <ImageOff className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!compact && <span>{fallbackText}</span>}
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        onError?.(e);
        setFailedSrc(src ?? null);
      }}
    />
  );
}
