import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Reveal from '../../../components/ui/Reveal';
import BackArrowIcon from '../../../components/ui/BackArrowIcon';
import { adminNoticesApi, type AdminNoticeResponse } from '../../../api/adminNotices';
import { API_BASE } from '../../../api/client';
import { formatYmd } from '../../../utils/date';

function toDateValue(value?: unknown) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value instanceof Date) return value;
  return null;
}

const PUBLIC_ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');

function resolveLegacyImageUrl(key: string): string {
  if (/^https?:\/\//i.test(key)) return key;
  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return '';
  return PUBLIC_ASSET_BASE
    ? `${PUBLIC_ASSET_BASE}/${normalized}`
    : `/${normalized}`;
}

function getNoticeImages(notice: AdminNoticeResponse | null): string[] {
  if (!notice) return [];
  const urls = notice.imageUrls?.filter(Boolean) ?? [];
  if (urls.length > 0) return urls;
  return (notice.imageKeys ?? [])
    .map(resolveLegacyImageUrl)
    .filter(Boolean);
}

export default function AdminNoticeDetailPage() {
  const navigate = useNavigate();
  const { noticeId } = useParams();

  const [notice, setNotice] = useState<AdminNoticeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!noticeId) return;
      setLoading(true);
      setError(null);
      try {
        const detail = await adminNoticesApi.getById(noticeId);
        if (!active) return;
        if (!detail) {
          setError('공지사항을 찾을 수 없어요.');
          setNotice(null);
          return;
        }
        setNotice(detail);
      } catch {
        if (!active) return;
        setError('공지사항을 불러오지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [noticeId]);

  const date = useMemo(() => {
    const raw = toDateValue(notice?.updatedAt ?? notice?.createdAt);
    return raw ? formatYmd(raw) : '';
  }, [notice?.createdAt, notice?.updatedAt]);

  const imageUrls = useMemo(() => {
    return getNoticeImages(notice);
  }, [notice]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </div>
    );
  }

  if (error && !notice) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!notice) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin/notices')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              공지사항 목록
            </button>
            <h1 className="mt-2 font-heading text-3xl text-primary">공지사항 상세</h1>
            <p className="mt-2 text-sm text-slate-600">등록된 공지사항 내용을 확인할 수 있어요</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/admin/notices/${notice.id}/edit`}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              수정
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={120} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400">제목</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{notice.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {date ? `${date} 업데이트` : '날짜 정보 없음'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400">내용</p>
            <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
              {notice.content}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400">이미지</p>
            {imageUrls.length > 0 ? (
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {imageUrls.map((url) => (
                  <div
                    key={url}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={url}
                      alt="공지 이미지"
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">등록된 이미지가 없어요.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400">이미지 키</p>
            {notice.imageKeys && notice.imageKeys.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {notice.imageKeys.map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {key}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">등록된 이미지가 없어요.</p>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
