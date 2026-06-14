import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { snsApi } from '../api/sns';
import instagramLogo from '../assets/logos/instagram.png';
import kakaoLogo from '../assets/logos/kakao.png';

export default function FloatingSns() {
  const queryClient = useQueryClient();

  const { data: snsLinks } = useQuery({
    queryKey: ['snsLinks'],
    queryFn: async () => {
      const [instagramResult, kakaoResult] = await Promise.allSettled([
        snsApi.getInstagram(),
        snsApi.getKakao(),
      ]);

      return {
        instagramUrl:
          instagramResult.status === 'fulfilled'
            ? instagramResult.value?.url ?? null
            : null,
        kakaoUrl:
          kakaoResult.status === 'fulfilled' ? kakaoResult.value?.url ?? null : null,
      };
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const onUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['snsLinks'] });
    };

    window.addEventListener('sns-updated', onUpdated);
    return () => {
      window.removeEventListener('sns-updated', onUpdated);
    };
  }, [queryClient]);

  const instagramUrl = snsLinks?.instagramUrl ?? null;
  const kakaoUrl = snsLinks?.kakaoUrl ?? null;

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden flex-col items-end gap-3 md:flex">
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="h-13 w-13 overflow-hidden rounded-full shadow-lg"
          aria-label="Instagram"
        >
          <img
            src={instagramLogo}
            alt="Instagram"
            className="h-full w-full rounded-full object-cover"
          />
        </a>
      )}

      {kakaoUrl && (
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noreferrer"
          className="h-13 w-13 overflow-hidden rounded-full shadow-lg"
          aria-label="Kakao"
        >
          <img
            src={kakaoLogo}
            alt="Kakao"
            className="h-full w-full rounded-full object-cover"
          />
        </a>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="h-13 w-13 rounded-full bg-[#002968] text-sm font-bold text-white shadow-lg"
      >
        TOP
      </button>
    </div>
  );
}
