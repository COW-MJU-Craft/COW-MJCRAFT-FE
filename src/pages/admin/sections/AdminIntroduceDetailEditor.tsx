import { useEffect, useRef, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';
import { ApiError } from '../../../api/core/client';
import {
  adminIntroduceApi,
  type AdminIntroduceDetailResponse,
  type AdminIntroduceDetailUpdateRequest,
} from '../../../api/admin/introduce';

type UploadTarget = 'current' | `history:${number}` | null;

const DEFAULT_DETAIL: AdminIntroduceDetailResponse = {
  intro: { title: '', slogan: '', body: '' },
  purpose: { title: '', description: '' },
  currentLogo: { title: '', imageKey: '', imageUrl: null, description: '' },
  logoHistories: [],
};

function resolveContentType(file: File): string {
  if (file.type && file.type.trim().length > 0) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
}

async function uploadToS3(uploadUrl: string, file: File, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!response.ok) throw new Error('S3 업로드에 실패했습니다.');
}

function normalizeDetail(payload?: AdminIntroduceDetailResponse | null): AdminIntroduceDetailResponse {
  if (!payload) return DEFAULT_DETAIL;

  return {
    intro: {
      title: payload.intro?.title ?? '',
      slogan: payload.intro?.slogan ?? '',
      body: payload.intro?.body ?? '',
    },
    purpose: {
      title: payload.purpose?.title ?? '',
      description: payload.purpose?.description ?? '',
    },
    currentLogo: payload.currentLogo
      ? {
          title: payload.currentLogo.title ?? '',
          imageKey: payload.currentLogo.imageKey ?? '',
          imageUrl: payload.currentLogo.imageUrl ?? null,
          description: payload.currentLogo.description ?? '',
        }
      : { title: '', imageKey: '', imageUrl: null, description: '' },
    logoHistories: Array.isArray(payload.logoHistories)
      ? payload.logoHistories.map((h) => ({
          year: h.year ?? '',
          imageKey: h.imageKey ?? '',
          imageUrl: h.imageUrl ?? null,
          description: h.description ?? '',
        }))
      : [],
    updatedAt: payload.updatedAt,
  };
}

function sanitizeDetail(payload: AdminIntroduceDetailResponse): AdminIntroduceDetailUpdateRequest {
  const introTitle = (payload.intro?.title ?? '').trim();
  const introSlogan = (payload.intro?.slogan ?? '').trim();
  const introBody = payload.intro?.body ?? '';

  const hasIntro = Boolean(introTitle || introSlogan || introBody.trim());
  const intro = hasIntro
    ? { title: introTitle, slogan: introSlogan, body: introBody.trim().length ? introBody : null }
    : null;

  const currentLogoTitle = (payload.currentLogo?.title ?? '').trim();
  const currentLogoKey = (payload.currentLogo?.imageKey ?? '').trim();
  const currentLogoDesc = (payload.currentLogo?.description ?? '').trim();

  const hasCurrentLogo = Boolean(currentLogoTitle || currentLogoKey || currentLogoDesc);
  const currentLogo = hasCurrentLogo
    ? {
        title: currentLogoTitle,
        imageKey: currentLogoKey.length ? currentLogoKey : null,
        description: currentLogoDesc.length ? currentLogoDesc : null,
      }
    : null;

  const histories = (payload.logoHistories ?? [])
    .map((h) => {
      const year = (h.year ?? '').trim();
      const imageKey = (h.imageKey ?? '').trim();
      const description = (h.description ?? '').trim();
      return {
        year,
        imageKey: imageKey.length ? imageKey : null,
        description: description.length ? description : null,
      };
    })
    .filter((h) => Boolean(h.year || h.imageKey || h.description));

  return {
    intro,
    purpose: {
      title: (payload.purpose?.title ?? '').trim(),
      description: (payload.purpose?.description ?? '').trim().length ? payload.purpose.description : null,
    },
    currentLogo,
    logoHistories: histories,
  };
}

function UploadBox({
  disabled,
  onFiles,
  title = '이미지를 여기로 드래그해서 업로드',
  subtitle = 'PNG/JPG/WEBP 권장',
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) onFiles(files);
      }}
      className={[
        'mt-3 rounded-2xl border-2 border-dashed p-5 transition',
        disabled ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
          파일 선택
          <input
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) onFiles(files);
              e.currentTarget.value = '';
            }}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

export default function AdminIntroduceDetailEditor() {
  const [detail, setDetail] = useState<AdminIntroduceDetailResponse>(DEFAULT_DETAIL);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadTarget>(null);

  const objectUrlsRef = useRef<string[]>([]);

  const reloadFromServer = async () => {
    const data = await adminIntroduceApi.getDetail();
    setDetail(normalizeDetail(data));
  };

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await adminIntroduceApi.getDetail();
        if (!active) return;
        setDetail(normalizeDetail(data));
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setDetail(DEFAULT_DETAIL);
          setError(null);
          return;
        }
        const message = err instanceof Error ? err.message : '불러오기 실패';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminIntroduceApi.updateDetail(sanitizeDetail(detail));
      await reloadFromServer();
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 실패';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const uploadOneImage = async (file: File) => {
    const contentType = resolveContentType(file);
    const presign = await adminIntroduceApi.presignSectionAssets({
      fileName: file.name,
      contentType,
    });
    if (!presign?.uploadUrl || !presign.key) throw new Error('Presign 응답이 올바르지 않습니다.');
    await uploadToS3(presign.uploadUrl, file, contentType);
    return presign.key as string;
  };

  const handleUploadCurrentLogo = async (files: File[]) => {
    const file = files.find(isImageFile);
    if (!file) return;

    setUploading('current');
    setError(null);

    const localUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(localUrl);

    try {
      const key = await uploadOneImage(file);

      setDetail((prev) => ({
        ...prev,
        currentLogo: {
          ...(prev.currentLogo ?? { title: '', imageKey: '', imageUrl: null, description: '' }),
          imageKey: key,
          imageUrl: localUrl,
        },
      }));
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== localUrl);
      const message = err instanceof Error ? err.message : '업로드 실패';
      setError(message);
    } finally {
      setUploading(null);
    }
  };

  const handleUploadHistoryImage = async (files: File[], index: number) => {
    const file = files.find(isImageFile);
    if (!file) return;

    setUploading(`history:${index}`);
    setError(null);

    const localUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(localUrl);

    try {
      const key = await uploadOneImage(file);

      setDetail((prev) => {
        const next = [...(prev.logoHistories ?? [])];
        next[index] = {
          ...(next[index] ?? { year: '', imageKey: '', imageUrl: null, description: '' }),
          imageKey: key,
          imageUrl: localUrl,
        };
        return { ...prev, logoHistories: next };
      });
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== localUrl);
      const message = err instanceof Error ? err.message : '업로드 실패';
      setError(message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <Reveal id="about-detail" delayMs={80} className="mt-8 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">소개 상세 편집</h2>
        <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
      </Reveal>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6">
      <Reveal id="about-detail" delayMs={80} className="rounded-3xl bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-slate-900">소개 상세 편집</h2>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}

        <div className="mt-6 grid grid-cols-1 gap-6">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <h3 className="text-sm font-bold text-slate-800">인트로</h3>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-xs font-semibold text-slate-600">타이틀</div>
                <input
                  value={detail.intro?.title ?? ''}
                  onChange={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      intro: { ...(prev.intro ?? { title: '', slogan: '', body: '' }), title: e.target.value },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
              </label>

              <label className="block">
                <div className="text-xs font-semibold text-slate-600">슬로건</div>
                <input
                  value={detail.intro?.slogan ?? ''}
                  onChange={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      intro: { ...(prev.intro ?? { title: '', slogan: '', body: '' }), slogan: e.target.value },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
              </label>

              <div>
                <MarkdownEditor
                  value={detail.intro?.body ?? ''}
                  onChange={(next) =>
                    setDetail((prev) => ({
                      ...prev,
                      intro: { ...(prev.intro ?? { title: '', slogan: '', body: '' }), body: next },
                    }))
                  }
                  leftLabel="본문"
                  rightLabel="미리보기"
                  minHeightClassName="min-h-[220px] md:h-[300px]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <h3 className="text-sm font-bold text-slate-800">목적</h3>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-xs font-semibold text-slate-600">제목</div>
                <input
                  value={detail.purpose?.title ?? ''}
                  onChange={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      purpose: { ...(prev.purpose ?? { title: '', description: '' }), title: e.target.value },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
              </label>

              <div>
                <MarkdownEditor
                  value={detail.purpose?.description ?? ''}
                  onChange={(next) =>
                    setDetail((prev) => ({
                      ...prev,
                      purpose: { ...(prev.purpose ?? { title: '', description: '' }), description: next },
                    }))
                  }
                  leftLabel="설명"
                  rightLabel="미리보기"
                  minHeightClassName="min-h-[220px] md:h-[300px]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <h3 className="text-sm font-bold text-slate-800">현재 로고</h3>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-xs font-semibold text-slate-600">제목</div>
                <input
                  value={detail.currentLogo?.title ?? ''}
                  onChange={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      currentLogo: {
                        ...(prev.currentLogo ?? { title: '', imageKey: '', imageUrl: null, description: '' }),
                        title: e.target.value,
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
              </label>

              <div>
                <MarkdownEditor
                  value={detail.currentLogo?.description ?? ''}
                  onChange={(next) =>
                    setDetail((prev) => ({
                      ...prev,
                      currentLogo: {
                        ...(prev.currentLogo ?? { title: '', imageKey: '', imageUrl: null, description: '' }),
                        description: next,
                      },
                    }))
                  }
                  leftLabel="설명"
                  rightLabel="미리보기"
                  minHeightClassName="min-h-[200px] md:h-[260px]"
                />
              </div>
            </div>

            <UploadBox disabled={uploading === 'current'} onFiles={handleUploadCurrentLogo} />

            {detail.currentLogo?.imageUrl ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-square w-full bg-slate-50">
                    <img src={detail.currentLogo.imageUrl ?? ''} alt="current-logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        const url = detail.currentLogo?.imageUrl;
                        if (url && url.startsWith('blob:')) {
                          URL.revokeObjectURL(url);
                          objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
                        }
                        setDetail((prev) => ({
                          ...prev,
                          currentLogo: {
                            ...(prev.currentLogo ?? { title: '', imageKey: '', imageUrl: null, description: '' }),
                            imageKey: '',
                            imageUrl: null,
                          },
                        }));
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">로고 히스토리</h3>
              <button
                type="button"
                onClick={() =>
                  setDetail((prev) => ({
                    ...prev,
                    logoHistories: [...(prev.logoHistories ?? []), { year: '', imageKey: '', imageUrl: null, description: '' }],
                  }))
                }
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
              >
                히스토리 추가
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(detail.logoHistories ?? []).length === 0 ? <p className="text-xs text-slate-500">등록된 히스토리가 없습니다.</p> : null}

              {(detail.logoHistories ?? []).map((history, idx) => {
                const isUploading = uploading === `history:${idx}`;
                const src = history.imageUrl ?? '';

                return (
                  <div key={`history-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">히스토리 {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const url = history.imageUrl;
                          if (url && typeof url === 'string' && url.startsWith('blob:')) {
                            URL.revokeObjectURL(url);
                            objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
                          }
                          setDetail((prev) => ({
                            ...prev,
                            logoHistories: (prev.logoHistories ?? []).filter((_, i) => i !== idx),
                          }));
                        }}
                        className="text-xs font-bold text-rose-500 hover:underline"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="block">
                        <div className="text-xs font-semibold text-slate-600">연도</div>
                        <input
                          value={history.year ?? ''}
                          onChange={(e) =>
                            setDetail((prev) => {
                              const next = [...(prev.logoHistories ?? [])];
                              next[idx] = { ...history, year: e.target.value };
                              return { ...prev, logoHistories: next };
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                        />
                      </label>

                      <div className="md:col-span-2">
                        <MarkdownEditor
                          value={history.description ?? ''}
                          onChange={(next) =>
                            setDetail((prev) => {
                              const updated = [...(prev.logoHistories ?? [])];
                              updated[idx] = { ...history, description: next };
                              return { ...prev, logoHistories: updated };
                            })
                          }
                          leftLabel="설명"
                          rightLabel="미리보기"
                          minHeightClassName="min-h-[200px] md:h-[260px]"
                        />
                      </div>
                    </div>

                    <UploadBox disabled={isUploading} onFiles={(files) => handleUploadHistoryImage(files, idx)} />

                    {src ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <div className="aspect-square w-full bg-slate-50">
                            <img src={src} alt={`history-${idx}`} className="h-full w-full object-contain" />
                          </div>
                          <div className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                const url = history.imageUrl;
                                if (url && typeof url === 'string' && url.startsWith('blob:')) {
                                  URL.revokeObjectURL(url);
                                  objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
                                }
                                setDetail((prev) => {
                                  const next = [...(prev.logoHistories ?? [])];
                                  next[idx] = { ...next[idx], imageKey: '', imageUrl: null };
                                  return { ...prev, logoHistories: next };
                                });
                              }}
                              className="rounded-lg px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </Reveal>

    </div>
  );
}
