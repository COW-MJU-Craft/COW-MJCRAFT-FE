import Reveal from '../../components/Reveal';
import {
  loadFeedbackEntries,
  removeFeedbackEntry,
  type FeedbackEntry,
} from '../../utils/feedbackStore';

type Props = {
  entries: FeedbackEntry[];
  setEntries: (next: FeedbackEntry[]) => void;
};

export default function AdminFeedbackListSection({
  entries,
  setEntries,
}: Props) {
  return (
    <Reveal
      id="feedback"
      delayMs={280}
      className="mt-10 rounded-3xl bg-white p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl text-slate-900">
          피드백 제출 목록
        </h2>
        <button
          type="button"
          onClick={() => setEntries(loadFeedbackEntries())}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          새로고침
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            아직 제출된 피드백이 없어요.
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                <span>{entry.isStudent}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{entry.message}</p>
              <button
                type="button"
                onClick={() => {
                  const next = removeFeedbackEntry(entry.id);
                  setEntries(next);
                }}
                className="mt-3 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </Reveal>
  );
}
