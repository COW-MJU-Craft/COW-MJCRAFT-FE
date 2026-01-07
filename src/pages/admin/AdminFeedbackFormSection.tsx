import Reveal from '../../components/Reveal';
import type { AdminContent } from '../../utils/adminContent';
import { toLines, toText } from './textUtils';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminFeedbackFormSection({
  content,
  updateContent,
}: Props) {
  return (
    <Reveal id="form" delayMs={240} className="mt-10 rounded-3xl bg-white p-8">
      <h2 className="font-heading text-xl text-slate-900">피드백 폼</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">질문 1</div>
          <input
            value={content.feedbackForm.question1}
            onChange={(e) =>
              updateContent({
                ...content,
                feedbackForm: {
                  ...content.feedbackForm,
                  question1: e.target.value,
                },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">
            질문 1 옵션 (줄바꿈으로 구분)
          </div>
          <textarea
            value={toText(content.feedbackForm.question1Options)}
            onChange={(e) =>
              updateContent({
                ...content,
                feedbackForm: {
                  ...content.feedbackForm,
                  question1Options: toLines(e.target.value),
                },
              })
            }
            rows={3}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="text-sm font-bold text-slate-700">질문 2</div>
          <input
            value={content.feedbackForm.question2}
            onChange={(e) =>
              updateContent({
                ...content,
                feedbackForm: {
                  ...content.feedbackForm,
                  question2: e.target.value,
                },
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>
      </div>
    </Reveal>
  );
}
