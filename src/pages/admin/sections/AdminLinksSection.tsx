import { useEffect, useRef } from 'react';
import Reveal from '../../../components/ui/Reveal';
import BrandIcon from '../../../components/ui/BrandIcon';
import { snsApi } from '../../../api/sns';
import type { AdminContent } from '../../../utils/adminContent';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminLinksSection({ content, updateContent }: Props) {
  const instagramUrl = content.links.instagramUrl ?? '';
  const kakaoUrl = content.links.kakaoUrl ?? '';

  const didPrefillRef = useRef(false);

  // 최초 진입 시 서버에 등록된 링크가 있으면 폼에 채워줌(비어있을 때만)
  useEffect(() => {
    if (didPrefillRef.current) return;

    const shouldPrefill = !instagramUrl.trim() && !kakaoUrl.trim();
    if (!shouldPrefill) {
      didPrefillRef.current = true;
      return;
    }

    let active = true;

    Promise.allSettled([snsApi.getInstagram(), snsApi.getKakao()])
      .then(([igRes, kkRes]) => {
        if (!active) return;

        const ig = igRes.status === 'fulfilled' ? igRes.value : null;
        const kk = kkRes.status === 'fulfilled' ? kkRes.value : null;

        if (ig?.url || kk?.url) {
          updateContent({
            ...content,
            links: {
              ...content.links,
              instagramUrl: ig?.url ?? '',
              kakaoUrl: kk?.url ?? '',
            },
          });
        }
      })
      .finally(() => {
        didPrefillRef.current = true;
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 이제 실제로 사용
  const inputBase =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary/60';

  return (
    <Reveal id="links" delayMs={120} className="mt-10 rounded-3xl bg-white p-8">
      <h2 className="font-heading text-xl text-slate-900">공식 링크</h2>
      <p className="mt-2 text-sm text-slate-600">
        저장하면 사이트의 플로팅 SNS 버튼 링크가 변경됩니다.
      </p>

      <div className="mt-6 space-y-5">
        {/* 인스타그램 */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <BrandIcon kind="instagram" /> 인스타그램 URL
          </div>
          <input
            value={instagramUrl}
            onChange={(e) =>
              updateContent({
                ...content,
                links: { ...content.links, instagramUrl: e.target.value },
              })
            }
            placeholder="https://instagram.com/..."
            className={inputBase}
          />
        </div>

        {/* 오픈채팅 */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <BrandIcon kind="kakao" /> 오픈채팅 URL
          </div>
          <input
            value={kakaoUrl}
            onChange={(e) =>
              updateContent({
                ...content,
                links: { ...content.links, kakaoUrl: e.target.value },
              })
            }
            placeholder="https://open.kakao.com/o/..."
            className={inputBase}
          />
        </div>
      </div>
    </Reveal>
  );
}
