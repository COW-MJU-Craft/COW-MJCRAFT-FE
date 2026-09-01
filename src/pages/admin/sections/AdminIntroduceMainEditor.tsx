import { useEffect, useRef, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import { ApiError } from '../../../api/core/client';
import { adminIntroduceApi } from '../../../api/admin/introduce';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';

type HeroLogoItem = {
  key: string;
  imageUrl?: string;
  localPreviewUrl?: string;
  fileName?: string;
};

type AdminIntroduceMainEditorState = {
  title: string;
  subtitle: string;
  summary: string;
  heroLogos: HeroLogoItem[];
};

type AdminIntroduceMainResponse = {
  title?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  heroLogos?: Array<{
    key?: string | null;
    imageUrl?: string | null;
  }> | null;
} | null;

const DEFAULT_MAIN: AdminIntroduceMainEditorState = {
  title: '',
  subtitle: '',
  summary: '',
  heroLogos: [],
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

function normalizeMain(
  payload: AdminIntroduceMainResponse,
): AdminIntroduceMainEditorState {
  if (!payload) return DEFAULT_MAIN;

  return {
    title: payload.title ?? '',
    subtitle: payload.subtitle ?? '',
    summary: payload.summary ?? '',
    heroLogos: Array.isArray(payload.heroLogos)
      ? payload.heroLogos
          .map((l) => ({
            key: (l.key ?? '').trim(),
            imageUrl: l.imageUrl ?? undefined,
          }))
          .filter((l: HeroLogoItem) => l.key.length > 0)
      : [],
  };
}

export default function AdminIntroduceMainEditor() {
  const [main, setMain] = useState<AdminIntroduceMainEditorState>(DEFAULT_MAIN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await adminIntroduceApi.getMain();
        if (!active) return;
        setMain(normalizeMain(data));
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setMain(DEFAULT_MAIN);
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

  const handleHeroLogoUploadFiles = async (files: File[]) => {
    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of imageFiles) {
        const contentType = resolveContentType(file);

        const presign = await adminIntroduceApi.presignHeroLogos({
          fileName: file.name,
          contentType,
        });

        if (!presign?.uploadUrl || !presign.key) {
          throw new Error('Presign 응답이 올바르지 않습니다.');
        }

        await uploadToS3(presign.uploadUrl, file, contentType);

        const localPreviewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(localPreviewUrl);

        setMain((prev) => ({
          ...prev,
          heroLogos: [
            ...(prev.heroLogos ?? []),
            {
              key: presign.key,
              localPreviewUrl,
              fileName: file.name,
            },
          ],
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '업로드 실패';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await adminIntroduceApi.updateMain({
        title: (main.title ?? '').trim(),
        subtitle: (main.subtitle ?? '').trim(),
        summary: main.summary ?? '',
        heroLogoKeys: (main.heroLogos ?? [])
          .map((l) => (l.key ?? '').trim())
          .filter((k) => k.length > 0),
      });

      const refreshed = await adminIntroduceApi.getMain();
      setMain(normalizeMain(refreshed));
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 실패';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Reveal id="about-main" delayMs={80} className="mt-8 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">소개 메인 편집</h2>
        <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
      </Reveal>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6">
      <Reveal id="about-main" delayMs={80} className="rounded-3xl bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-slate-900">소개 메인 편집</h2>
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

        {error ? (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4">
          <label className="block">
            <div className="text-sm font-bold text-slate-700">타이틀</div>
            <input
              value={main.title}
              onChange={(e) => setMain((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </label>

          <label className="block">
            <div className="text-sm font-bold text-slate-700">서브타이틀</div>
            <input
              value={main.subtitle}
              onChange={(e) => setMain((prev) => ({ ...prev, subtitle: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </label>

          <div>
            <MarkdownEditor
              value={main.summary}
              onChange={(next) => setMain((prev) => ({ ...prev, summary: next }))}
              leftLabel="요약"
              rightLabel="미리보기"
              placeholder={`예)\n**굵게**\n줄바꿈은 엔터`}
              minHeightClassName="min-h-[240px] md:h-[360px]"
            />
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-bold text-slate-700">로고 등록</div>
          <p className="mt-1 text-xs text-slate-500">이미지를 드래그하거나 파일을 선택해서 여러 장 등록할 수 있어요.</p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length > 0) handleHeroLogoUploadFiles(files);
            }}
            className={[
              'mt-3 rounded-2xl border-2 border-dashed p-5 transition',
              uploading ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white hover:bg-slate-50',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-700">이미지를 여기로 드래그해서 업로드</div>
                <div className="mt-1 text-xs text-slate-500">PNG/JPG/WEBP 권장 · 여러 장 가능</div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                파일 선택
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) handleHeroLogoUploadFiles(files);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {uploading ? <p className="mt-3 text-xs text-slate-500">업로드 중...</p> : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {main.heroLogos.map((logo, idx) => {
              const src = logo.imageUrl || logo.localPreviewUrl || '';
              return (
                <div key={`${logo.key}-${idx}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-square w-full bg-slate-50">
                    {src ? (
                      <img src={src} alt={logo.fileName ?? logo.key} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">이미지 없음</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700">{logo.fileName ?? 'logo'}</p>
                      <p className="truncate text-[11px] text-slate-400">{logo.key}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (logo.localPreviewUrl) {
                          URL.revokeObjectURL(logo.localPreviewUrl);
                          objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== logo.localPreviewUrl);
                        }
                        setMain((prev) => ({
                          ...prev,
                          heroLogos: prev.heroLogos.filter((_, i) => i !== idx),
                        }));
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

    </div>
  );
}
