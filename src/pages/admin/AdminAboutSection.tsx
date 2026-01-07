import Reveal from '../../components/Reveal';
import type { AdminContent } from '../../utils/adminContent';
import { toLines, toText } from './textUtils';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminAboutSection({ content, updateContent }: Props) {
  return (
    <Reveal id="about" delayMs={80} className="mt-8 rounded-3xl bg-white p-8">
      <h2 className="font-heading text-xl text-slate-900">소개 페이지</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-bold text-slate-700">헤드라인</div>
          <input
            value={content.about.headline}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, headline: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <div className="text-sm font-bold text-slate-700">서브 헤드라인</div>
          <input
            value={content.about.subheadline}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, subheadline: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">소개 문단</div>
          <textarea
            value={toText(content.about.intro)}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, intro: toLines(e.target.value) },
              })
            }
            rows={4}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <div className="text-sm font-bold text-slate-700">목적 제목</div>
          <input
            value={content.about.purposeTitle}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, purposeTitle: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">목적 본문</div>
          <textarea
            value={toText(content.about.purposeBody)}
            onChange={(e) =>
              updateContent({
                ...content,
                about: {
                  ...content.about,
                  purposeBody: toLines(e.target.value),
                },
              })
            }
            rows={4}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <div className="text-sm font-bold text-slate-700">로고 제목</div>
          <input
            value={content.about.logoTitle}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, logoTitle: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">로고 본문</div>
          <textarea
            value={toText(content.about.logoBody)}
            onChange={(e) =>
              updateContent({
                ...content,
                about: {
                  ...content.about,
                  logoBody: toLines(e.target.value),
                },
              })
            }
            rows={5}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">하단 문구</div>
          <input
            value={content.about.footerNote}
            onChange={(e) =>
              updateContent({
                ...content,
                about: { ...content.about, footerNote: e.target.value },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
      </div>
    </Reveal>
  );
}
