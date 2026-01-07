import Reveal from '../../components/Reveal';
import {
  createLinkItem,
  type AdminContent,
  type LinkItem,
} from '../../utils/adminContent';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminLinktreeSection({ content, updateContent }: Props) {
  const updateLinkItem = (id: string, patch: Partial<LinkItem>) => {
    updateContent({
      ...content,
      linktree: content.linktree.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  return (
    <Reveal
      id="linktree"
      delayMs={160}
      className="mt-10 rounded-3xl bg-white p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl text-slate-900">링크트리 정보</h2>
        <button
          type="button"
          onClick={() =>
            updateContent({
              ...content,
              linktree: [...content.linktree, createLinkItem()],
            })
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          링크 추가
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {content.linktree.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={item.title}
                onChange={(e) =>
                  updateLinkItem(item.id, { title: e.target.value })
                }
                placeholder="제목"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <input
                value={item.url}
                onChange={(e) => updateLinkItem(item.id, { url: e.target.value })}
                placeholder="URL"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <select
                value={item.kind}
                onChange={(e) =>
                  updateLinkItem(item.id, {
                    kind: e.target.value as LinkItem['kind'],
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              >
                <option value="instagram">Instagram</option>
                <option value="kakao">Kakao</option>
                <option value="notion">Notion</option>
                <option value="drive">Google Drive</option>
                <option value="form">Form</option>
                <option value="link">Other</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                value={item.description ?? ''}
                onChange={(e) =>
                  updateLinkItem(item.id, { description: e.target.value })
                }
                placeholder="설명(선택)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <button
                type="button"
                onClick={() =>
                  updateContent({
                    ...content,
                    linktree: content.linktree.filter(
                      (link) => link.id !== item.id
                    ),
                  })
                }
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
