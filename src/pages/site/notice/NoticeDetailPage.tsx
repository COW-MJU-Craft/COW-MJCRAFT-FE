import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import Reveal from '../../../components/ui/Reveal';
import { noticesApi, type NoticeResponse } from '../../../api/site/notices';
import { API_BASE } from '../../../api/core/client';
import { formatYmd, parseDateLike } from '../../../utils/common/date';

const PUBLIC_ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');

function resolveLegacyImageUrl(key: string) {
  if (/^https?:\/\//i.test(key)) return key;
  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return '';
  return PUBLIC_ASSET_BASE
    ? `${PUBLIC_ASSET_BASE}/${normalized}`
    : `/${normalized}`;
}

function getNoticeImages(notice: NoticeResponse): string[] {
  const urls = notice.imageUrls?.filter(Boolean) ?? [];
  if (urls.length > 0) return urls;
  return (notice.imageKeys ?? [])
    .map(resolveLegacyImageUrl)
    .filter(Boolean);
}

export default function NoticeDetailPage() {
  const { noticeId } = useParams();
  const [notice, setNotice] = useState<NoticeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        if (!noticeId) {
          if (!active) return;
          setNotice(null);
          setNotFound(true);
          return;
        }
        const data = await noticesApi.getById(noticeId);
        if (!active) return;
        setNotice(data ?? null);
        setNotFound(!data);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [noticeId]);

  const dateLabel = useMemo(() => {
    if (!notice) return '';
    const date = parseDateLike(notice.updatedAt ?? notice.createdAt);
    return date ? formatYmd(date) : '-';
  }, [notice]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-slate-600">
        불러오는 중...
      </div>
    );
  }

  if (notFound || !notice) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-heading text-2xl text-slate-900">
          공지사항을 찾을 수 없어요.
        </h1>
        <Link
          to="/notices"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <svg
            width="14"
            height="14"
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
          공지사항 목록
        </Link>
      </div>
    );
  }

  const images = getNoticeImages(notice);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <Link
          to="/notices"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <svg
            width="14"
            height="14"
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
          공지사항 목록
        </Link>
        <div className="mt-4">
          <h1 className="font-heading text-3xl text-slate-900">
            {notice.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{dateLabel}</p>
        </div>
      </Reveal>

      <Reveal
        delayMs={120}
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6"
      >
        {notice.content ? (
          <div className="prose max-w-none text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {notice.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-slate-500">내용이 없습니다.</p>
        )}
      </Reveal>

      <Reveal delayMs={180} className="mt-6">
        {images.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((url, idx) => (
              <button
                key={`${notice.id}-image-${idx}`}
                type="button"
                onClick={() => setActiveImage(url)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={url}
                  alt={`${notice.title} 이미지 ${idx + 1}`}
                  className="h-64 w-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm font-semibold text-slate-400">
            등록된 이미지가 없어요
          </div>
        )}
      </Reveal>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="max-h-[80vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-xl">
            <img
              src={activeImage}
              alt="공지 이미지 확대"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
