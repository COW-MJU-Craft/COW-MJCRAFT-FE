import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  leftLabel?: string;
  rightLabel?: string;
};

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '',
  minHeightClassName = 'min-h-[240px] md:h-[360px]',
  leftLabel = '상세 설명',
  rightLabel = '미리보기',
}: MarkdownEditorProps) {
  const hasValue = useMemo(() => value.trim().length > 0, [value]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const heightClassName = minHeightClassName.replace(/min-h-/g, 'h-');

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <p className="text-sm font-bold text-slate-700">{leftLabel}</p>
        <p className="text-sm font-bold text-slate-700 md:text-left">{rightLabel}</p>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold transition',
              activeTab === tab
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {tab === 'edit' ? '입력' : '미리보기'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div
          className={[
            'flex flex-col rounded-2xl border border-slate-200 bg-white p-4',
            heightClassName,
            activeTab === 'preview' ? 'hidden md:flex' : '',
          ].join(' ')}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={[
              'flex-1 min-h-0 w-full resize-none bg-transparent text-sm leading-relaxed text-slate-900',
              'placeholder:text-slate-300 focus:outline-none',
              'overflow-y-auto pr-2',
            ].join(' ')}
          />
        </div>

        <div
          className={[
            'flex flex-col',
            heightClassName,
            activeTab === 'edit' ? 'hidden md:flex' : '',
          ].join(' ')}
        >
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 h-full">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 text-sm text-slate-800">
              {hasValue ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ ...props }) => (
                      <h2 className="mt-6 text-lg font-heading text-slate-900 first:mt-0" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h3 className="mt-5 text-base font-heading text-slate-900 first:mt-0" {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <h4 className="mt-4 text-sm font-heading text-slate-900 first:mt-0" {...props} />
                    ),
                    p: ({ ...props }) => <p className="mt-3 leading-relaxed first:mt-0" {...props} />,
                    ul: ({ ...props }) => (
                      <ul className="mt-3 list-disc space-y-2 pl-5 first:mt-0" {...props} />
                    ),
                    ol: ({ ...props }) => (
                      <ol className="mt-3 list-decimal space-y-2 pl-5 first:mt-0" {...props} />
                    ),
                    li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                    hr: ({ ...props }) => <hr className="my-5 border-slate-200" {...props} />,
                    strong: ({ ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                    em: ({ ...props }) => <em className="italic text-slate-700" {...props} />,
                    code: ({ className, ...props }) => {
                      const isBlock = Boolean(className);
                      if (isBlock) {
                        return <code className="block whitespace-pre-wrap break-words" {...props} />;
                      }
                      return (
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700" {...props} />
                      );
                    },
                    pre: ({ ...props }) => (
                      <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700" {...props} />
                    ),
                  }}
                >
                  {value}
                </ReactMarkdown>
              ) : (
                <div className="text-sm font-semibold text-slate-400">
                  상세 설명을 입력하면 오른쪽에 미리보기가 표시돼요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowCheatSheet((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
          aria-expanded={showCheatSheet}
        >
          <span>Markdown 사용법</span>
          <span
            className={[
              'text-[10px] transition',
              showCheatSheet ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
          >
            ▾
          </span>
        </button>

        {showCheatSheet && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="grid gap-2">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">제목</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  ## 제목
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">강조</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  **강조**
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">목록</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  - 항목 / 1. 항목
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">링크</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  [텍스트](https://...)
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">구분선</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  ---
                </span>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-slate-500">줄바꿈</span>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono overflow-x-auto">
                  &lt;br&gt;
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
