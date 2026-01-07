import Reveal from '../../components/Reveal';
import BrandIcon from '../../components/BrandIcon';
import type { AdminContent } from '../../utils/adminContent';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminLinksSection({ content, updateContent }: Props) {
  return (
    <Reveal id="links" delayMs={120} className="mt-10 rounded-3xl bg-white p-8">
      <h2 className="font-heading text-xl text-slate-900">공식 링크</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <BrandIcon kind="instagram" /> 인스타그램 URL
          </div>
          <input
            value={content.links.instagramUrl}
            onChange={(e) =>
              updateContent({
                ...content,
                links: { ...content.links, instagramUrl: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <BrandIcon kind="kakao" /> 오픈채팅 URL
          </div>
          <input
            value={content.links.kakaoUrl}
            onChange={(e) =>
              updateContent({
                ...content,
                links: { ...content.links, kakaoUrl: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
      </div>
    </Reveal>
  );
}
