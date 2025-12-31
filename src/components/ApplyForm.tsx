// src/components/ApplyForm.tsx
import { useState } from 'react';
import type { Project } from '../api/mock/projects';

export default function ApplyForm({ project }: { project: Project }) {
  const canApply = project.status === 'active';
  const [submitted, setSubmitted] = useState(false);

  if (!canApply) {
    return (
      <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-600">
        {project.status === 'closed'
          ? '마감된 프로젝트라 신청할 수 없어요.'
          : '아직 준비중인 프로젝트예요.'}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        console.log('apply payload', Object.fromEntries(fd.entries()));
        setSubmitted(true);
      }}
      className="mt-4 space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-sm font-bold text-slate-700">이름</div>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="홍길동"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm font-bold text-slate-700">
            연락처(또는 이메일)
          </div>
          <input
            name="contact"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="010-0000-0000 / email@example.com"
          />
        </label>
      </div>

      {(project.options ?? []).map((opt) => (
        <label key={opt.name} className="block">
          <div className="mb-1 text-sm font-bold text-slate-700">
            {opt.name}
          </div>
          <select
            name={`option_${opt.name}`}
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            defaultValue=""
          >
            <option value="" disabled>
              선택
            </option>
            {opt.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}

      <label className="block">
        <div className="mb-1 text-sm font-bold text-slate-700">수량</div>
        <input
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
      </label>

      <button
        type="submit"
        className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
      >
        신청 제출
      </button>

      {submitted && (
        <div className="rounded-2xl bg-primary/10 p-4 text-sm font-bold text-primary">
          제출 완료(임시)! 콘솔에서 payload를 확인할 수 있어요.
        </div>
      )}
    </form>
  );
}
