import Reveal from '../../components/Reveal';
import {
  createProjectIntro,
  type AdminContent,
  type ProjectIntro,
} from '../../utils/adminContent';

type Props = {
  content: AdminContent;
  updateContent: (next: AdminContent) => void;
};

export default function AdminProjectsSection({
  content,
  updateContent,
}: Props) {
  const updateProject = (id: string, patch: Partial<ProjectIntro>) => {
    updateContent({
      ...content,
      projectsIntro: content.projectsIntro.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  return (
    <Reveal
      id="projects"
      delayMs={200}
      className="mt-10 rounded-3xl bg-white p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl text-slate-900">프로젝트 소개</h2>
        <button
          type="button"
          onClick={() =>
            updateContent({
              ...content,
              projectsIntro: [...content.projectsIntro, createProjectIntro()],
            })
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          프로젝트 추가
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {content.projectsIntro.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={item.term}
                onChange={(e) => updateProject(item.id, { term: e.target.value })}
                placeholder="학기 (예: 2025-1)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <input
                value={item.date}
                onChange={(e) => updateProject(item.id, { date: e.target.value })}
                placeholder="날짜 (예: 25.04.01)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <input
                value={item.title}
                onChange={(e) => updateProject(item.id, { title: e.target.value })}
                placeholder="프로젝트 제목"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <textarea
              value={item.summary}
              onChange={(e) => updateProject(item.id, { summary: e.target.value })}
              rows={3}
              placeholder="프로젝트 설명"
              className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />

            <div className="mt-3 space-y-2">
              {item.links.map((link, idx) => (
                <div
                  key={`${item.id}-link-${idx}`}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    value={link.label}
                    onChange={(e) => {
                      const links = item.links.map((l, i) =>
                        i === idx ? { ...l, label: e.target.value } : l
                      );
                      updateProject(item.id, { links });
                    }}
                    placeholder="링크 제목"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => {
                      const links = item.links.map((l, i) =>
                        i === idx ? { ...l, url: e.target.value } : l
                      );
                      updateProject(item.id, { links });
                    }}
                    placeholder="링크 URL"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const links = item.links.filter((_, i) => i !== idx);
                      updateProject(item.id, {
                        links: links.length ? links : [{ label: '', url: '' }],
                      });
                    }}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  updateProject(item.id, {
                    links: [...item.links, { label: '', url: '' }],
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                링크 추가
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                updateContent({
                  ...content,
                  projectsIntro: content.projectsIntro.filter(
                    (p) => p.id !== item.id
                  ),
                })
              }
              className="mt-4 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              프로젝트 삭제
            </button>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
