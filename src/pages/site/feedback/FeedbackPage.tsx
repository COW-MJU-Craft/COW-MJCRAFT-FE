import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, withApiBase } from '../../../api/client';
import Reveal from '../../../components/ui/Reveal';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const TITLE_MAX = 50;
const CONTENT_MAX = 1000;

export default function FeedbackPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [titleLimitHit, setTitleLimitHit] = useState(false);
  const [contentLimitHit, setContentLimitHit] = useState(false);

  const successMsg = useMemo(() => '건의사항이 등록됐어요. 감사합니다!', []);

  const validate = () => {
    const t = title.trim();
    const c = content.trim();

    if (!t) return '제목을 입력해 주세요.';
    if (!c) return '내용을 입력해 주세요.';

    if (t.length > TITLE_MAX)
      return `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
    if (c.length > CONTENT_MAX)
      return `내용은 ${CONTENT_MAX}자 이내로 입력해 주세요.`;

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'submitting') return;

    const validationError = validate();
    if (validationError) {
      setStatus('error');
      setErrorMsg(validationError);
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    try {
      await api<void>(withApiBase('/feedback'), {
        method: 'POST',
        body: {
          title: title.trim(),
          content: content.trim(),
        },
      });

      setStatus('success');
      setTitle('');
      setContent('');
      setTitleLimitHit(false);
      setContentLimitHit(false);
    } catch (err) {
      let msg = '등록에 실패했어요. 잠시 후 다시 시도해 주세요.';

      if (err instanceof ApiError) {
        msg = err.message || msg;

        if (err.status === 401 || err.status === 403) {
          msg = '로그인이 필요해요. 로그인 후 다시 시도해 주세요.';
        }
      }

      setStatus('error');
      setErrorMsg(msg);
    }
  };

  const clearGlobalMessageIfNeeded = () => {
    if (status === 'error' || status === 'success') {
      setStatus('idle');
      setErrorMsg(null);
    }
  };

  const flashTitleLimit = () => {
    setTitleLimitHit(true);
    window.setTimeout(() => setTitleLimitHit(false), 1500);
  };

  const flashContentLimit = () => {
    setContentLimitHit(true);
    window.setTimeout(() => setContentLimitHit(false), 1500);
  };

  const onChangeTitle = (v: string) => {
    clearGlobalMessageIfNeeded();

    if (v.length <= TITLE_MAX) {
      setTitle(v);
      setTitleLimitHit(false);
      return;
    }

    setTitle(v.slice(0, TITLE_MAX));
    flashTitleLimit();
  };

  const onChangeContent = (v: string) => {
    clearGlobalMessageIfNeeded();

    if (v.length <= CONTENT_MAX) {
      setContent(v);
      setContentLimitHit(false);
      return;
    }

    setContent(v.slice(0, CONTENT_MAX));
    flashContentLimit();
  };

  const isSubmitting = status === 'submitting';

  const titleErrorText = titleLimitHit
    ? `제목은 최대 ${TITLE_MAX}자까지 입력할 수 있어요.`
    : null;

  const contentErrorText = contentLimitHit
    ? `내용은 최대 ${CONTENT_MAX}자까지 입력할 수 있어요.`
    : null;

  const inputBase =
    'mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition disabled:bg-slate-50';

  const focusRing = 'focus:ring-4 focus:ring-primary/10';
  const focusBorderOk = 'border-slate-200 focus:border-primary/60';
  const focusBorderErr =
    'border-rose-300 focus:border-rose-400 focus:ring-rose-100';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Reveal>
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-heading text-3xl text-primary hover:opacity-90"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          피드백
        </Link>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          더 나은 서비스를 위해 피드백을 제출해주세요!
        </p>
      </Reveal>

      <Reveal
        id="feedback"
        delayMs={120}
        className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:mt-10 sm:p-8"
      >
        {/* 헤더: 모바일은 세로, sm 이상은 가로 정렬 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg text-slate-900 sm:text-xl">
              피드백 제출 폼
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              명지공방에게 전하고 싶은 이야기를 들려주세요.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {status === 'success' && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                제출 완료
              </span>
            )}
            {status === 'error' && (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
                확인 필요
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* 제목 */}
          <div>
            <label className="text-sm font-medium text-slate-900">제목</label>
            <input
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="예) 예약 화면 개선 요청"
              className={[
                inputBase,
                focusRing,
                titleLimitHit ? focusBorderErr : focusBorderOk,
              ].join(' ')}
            />

            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-xs text-rose-600">{titleErrorText ?? ''}</p>
              <p className="text-xs text-slate-400">
                {title.length}/{TITLE_MAX}
              </p>
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-sm font-medium text-slate-900">내용</label>
            <textarea
              value={content}
              onChange={(e) => onChangeContent(e.target.value)}
              disabled={isSubmitting}
              placeholder="예) 예약 가능한 날짜를 달력으로 보여주면 좋겠습니다."
              rows={6}
              className={[
                inputBase,
                'resize-y',
                'min-h-[160px] sm:min-h-[220px]', // ✅ 모바일/데스크탑 높이 차등
                focusRing,
                contentLimitHit ? focusBorderErr : focusBorderOk,
              ].join(' ')}
            />

            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-xs text-rose-600">{contentErrorText ?? ''}</p>
              <p className="text-xs text-slate-400">
                {content.length}/{CONTENT_MAX}
              </p>
            </div>
          </div>

          {/* 성공/실패 메시지 (제출 결과) */}
          <div className="min-h-[22px]">
            {status === 'success' && (
              <p className="text-sm text-emerald-600">{successMsg}</p>
            )}
            {status === 'error' && errorMsg && (
              <p className="text-sm text-rose-600">{errorMsg}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-slate-500 sm:max-w-[70%]">
              제출된 피드백은 내부 검토 후 서비스 개선에 반영될 수 있어요.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? '전송 중...' : '전송하기'}
            </button>
          </div>
        </form>
      </Reveal>
    </div>
  );
}
