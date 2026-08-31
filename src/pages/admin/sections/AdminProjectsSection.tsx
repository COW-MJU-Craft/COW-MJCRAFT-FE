import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import { projectsApi } from '../../../api/projects';
import {
  adminProjectsApi,
  uploadToPresignedUrl,
} from '../../../api/adminProjects';
import type { Project } from '../../../api/projects';
import type {
  AdminProjectCategory,
  AdminProjectResponse,
  AdminProjectStatus,
  PresignPutItem,
} from '../../../api/adminProjects';

type Props = {
  registerSave?: (handler: () => Promise<string | null>) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type AdminProjectForm = {
  localId: string;
  id?: string;
  title: string;
  summary: string;
  description: string;
  status: AdminProjectStatus;
  category: AdminProjectCategory;
  deadlineDate: string;
  thumbnailKey?: string;
  imageKeys: string[];
  thumbnailUrl?: string;
  imageUrls?: string[];
  thumbnailPreviewUrl?: string;
  imagePreviewUrls?: string[];
  isDirty?: boolean;
  isUploadingThumbnail?: boolean;
  isUploadingImages?: boolean;
  thumbnailUploadError?: string | null;
  imageUploadError?: string | null;
  validationError?: string | null;
};

const STATUS_OPTIONS: { label: string; value: AdminProjectStatus }[] = [
  { label: '준비중', value: 'PREPARING' },
  { label: '진행중', value: 'OPEN' },
  { label: '마감', value: 'CLOSED' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

function toIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4},\d{1,2},\d{1,2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split(',');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  }

  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value as number[];
    if (!year || !month || !day) return '';
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return '';
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function createLocalId() {
  return `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyProject(): AdminProjectForm {
  return {
    localId: createLocalId(),
    title: '',
    summary: '',
    description: '',
    status: 'PREPARING',
    category: 'GOODS',
    deadlineDate: '',
    imageKeys: [],
    isDirty: true,
  };
}

function resolveContentType(file: File): string {
  if (file.type && file.type.trim().length > 0) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function mapProjectToForm(project: Project): AdminProjectForm {
  return {
    localId: project.id || createLocalId(),
    id: project.id || undefined,
    title: project.title ?? '',
    summary: project.summary ?? '',
    description: project.description ?? '',
    status: project.status,
    category: 'GOODS',
    deadlineDate: toIsoDate(project.deadlineDate ?? project.endAt ?? ''),
    thumbnailKey: project.thumbnailKey ?? '',
    thumbnailUrl: project.thumbnailUrl ?? undefined,
    imageUrls: project.imageUrls ?? undefined,
    imageKeys: project.imageKeys ?? [],
    isDirty: false,
  };
}

function mergeServerProject(
  form: AdminProjectForm,
  saved: AdminProjectResponse | null,
): AdminProjectForm {
  if (!saved) return { ...form, isDirty: false };

  const hasThumbnailUrl = Boolean(saved.thumbnailUrl);
  const hasImageUrls = Boolean(saved.imageUrls && saved.imageUrls.length > 0);

  return {
    ...form,
    localId: String(saved.id ?? form.localId),
    id: String(saved.id ?? form.id ?? ''),
    title: saved.title ?? form.title,
    summary: saved.summary ?? form.summary,
    description: saved.description ?? form.description,
    status: saved.status ?? form.status,
    category: saved.category ?? form.category,
    deadlineDate: toIsoDate(saved.deadlineDate ?? form.deadlineDate),
    thumbnailKey: saved.thumbnailKey ?? form.thumbnailKey,
    imageKeys: saved.imageKeys ?? form.imageKeys,
    thumbnailUrl: saved.thumbnailUrl ?? form.thumbnailUrl,
    imageUrls: saved.imageUrls ?? form.imageUrls,
    thumbnailPreviewUrl: hasThumbnailUrl ? undefined : form.thumbnailPreviewUrl,
    imagePreviewUrls: hasImageUrls ? [] : form.imagePreviewUrls,
    isDirty: false,
    thumbnailUploadError: null,
    imageUploadError: null,
    validationError: null,
  };
}

function matchPresignItems(
  files: File[],
  items: PresignPutItem[],
): PresignPutItem[] {
  const map = new Map<string, PresignPutItem[]>();
  items.forEach((item) => {
    const list = map.get(item.fileName) ?? [];
    list.push(item);
    map.set(item.fileName, list);
  });

  return files.map((file, idx) => {
    const list = map.get(file.name);
    if (list && list.length > 0) return list.shift() as PresignPutItem;
    return items[idx] as PresignPutItem;
  });
}

export default function AdminProjectsSection({
  registerSave,
  onDirtyChange,
}: Props) {
  const [projects, setProjects] = useState<AdminProjectForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const notifyDirty = useCallback(
    (nextDirty: boolean) => {
      onDirtyChange?.(nextDirty);
    },
    [onDirtyChange],
  );

  const updateProject = useCallback(
    (localId: string, patch: Partial<AdminProjectForm>) => {
      setProjects((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? {
                ...item,
                ...patch,
                isDirty: patch.isDirty ?? true,
              }
            : item,
        ),
      );
      notifyDirty(true);
    },
    [notifyDirty],
  );

  const createPreviewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const list = await projectsApi.list();
        const detailed = await Promise.all(
          list.map(async (item) => {
            const detail = await projectsApi.getById(item.id);
            return mapProjectToForm(detail ?? item);
          }),
        );
        if (!active) return;
        setProjects(detailed);
        notifyDirty(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '로드에 실패했어요.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [notifyDirty]);

  const validateProject = useCallback((item: AdminProjectForm) => {
    if (!item.title.trim()) return '프로젝트 제목을 입력해 주세요.';
    if (!item.deadlineDate.trim()) return '마감일을 입력해 주세요.';
    if (!item.summary.trim()) return '한 줄 설명을 입력해 주세요.';
    if (!item.description.trim()) return '상세 설명을 입력해 주세요.';
    if (!item.thumbnailKey?.trim()) return '대표 이미지를 업로드해 주세요.';
    if (!item.status) return '상태를 선택해 주세요.';
    return null;
  }, []);

  const buildPayload = useCallback((item: AdminProjectForm) => {
    return {
      title: item.title.trim(),
      summary: item.summary.trim(),
      description: item.description.trim(),
      status: item.status,
      category: item.category,
      deadlineDate: item.deadlineDate.trim(),
      thumbnailKey: item.thumbnailKey?.trim() ?? '',
      imageKeys: item.imageKeys.length ? item.imageKeys : undefined,
    };
  }, []);

  const saveAll = useCallback(async () => {
    let firstInvalidId: string | null = null;

    setProjects((prev) =>
      prev.map((item) => {
        const message = validateProject(item);
        if (message && !firstInvalidId) firstInvalidId = item.localId;
        return {
          ...item,
          validationError: message,
        };
      }),
    );

    if (firstInvalidId) {
      const target = document.getElementById(`admin-project-${firstInvalidId}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return '필수 입력값을 확인해 주세요.';
    }

    const next: AdminProjectForm[] = [];

    for (const item of projects) {
      const payload = buildPayload(item);
      const saved = item.id
        ? await adminProjectsApi.updateProject(item.id, payload)
        : await adminProjectsApi.createProject(payload);
      next.push(mergeServerProject(item, saved));
    }

    setProjects(next);
    notifyDirty(false);
    return '저장했어요.';
  }, [buildPayload, notifyDirty, projects, validateProject]);

  useEffect(() => {
    registerSave?.(saveAll);
  }, [registerSave, saveAll]);

  const handleDelete = useCallback(
    async (item: AdminProjectForm) => {
      if (!item.id) {
        setProjects((prev) => prev.filter((p) => p.localId !== item.localId));
        notifyDirty(true);
        return;
      }

      await adminProjectsApi.deleteProject(item.id);
      setProjects((prev) => prev.filter((p) => p.localId !== item.localId));
      notifyDirty(true);
    },
    [notifyDirty],
  );

  const handleThumbnailUpload = useCallback(
    async (localId: string, files: File[]) => {
      if (!files.length) return;
      const file = files[0];
      const contentType = resolveContentType(file);
      const previewUrl = createPreviewUrl(file);
      updateProject(localId, {
        thumbnailPreviewUrl: previewUrl,
        isUploadingThumbnail: true,
        thumbnailUploadError: null,
      });

      try {
        const res = await adminProjectsApi.presignThumbnail({
          files: [{ fileName: file.name, contentType }],
        });
        const items = res.items ?? [];
        const target = items[0];
        if (!target) throw new Error('업로드 URL이 없습니다.');
        await uploadToPresignedUrl(target.uploadUrl, file, contentType);
        updateProject(localId, { thumbnailKey: target.key });
      } catch (err) {
        updateProject(localId, {
          thumbnailUploadError:
            err instanceof Error ? err.message : '업로드에 실패했어요.',
        });
      } finally {
        updateProject(localId, { isUploadingThumbnail: false, isDirty: true });
      }
    },
    [createPreviewUrl, updateProject],
  );

  const handleImagesUpload = useCallback(
    async (localId: string, files: File[]) => {
      if (!files.length) return;
      const payloadFiles = files.map((file) => ({
        fileName: file.name,
        contentType: resolveContentType(file),
      }));
      const previews = files.map((file) => createPreviewUrl(file));

      setProjects((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? {
                ...item,
                imagePreviewUrls: [
                  ...(item.imagePreviewUrls ?? []),
                  ...previews,
                ],
                isUploadingImages: true,
                imageUploadError: null,
                isDirty: true,
              }
            : item,
        ),
      );
      notifyDirty(true);

      try {
        const res = await adminProjectsApi.presignImages({ files: payloadFiles });
        const items = res.items ?? [];
        const matched = matchPresignItems(files, items);

        await Promise.all(
          matched.map((target, idx) =>
            uploadToPresignedUrl(
              target.uploadUrl,
              files[idx],
              payloadFiles[idx].contentType,
            ),
          ),
        );

        const keys = matched.map((item) => item.key);
        setProjects((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  imageKeys: [...item.imageKeys, ...keys],
                }
              : item,
          ),
        );
      } catch (err) {
        updateProject(localId, {
          imageUploadError:
            err instanceof Error ? err.message : '업로드에 실패했어요.',
        });
      } finally {
        updateProject(localId, { isUploadingImages: false, isDirty: true });
      }
    },
    [createPreviewUrl, notifyDirty, updateProject],
  );

  const handleThumbnailClear = useCallback((localId: string) => {
    updateProject(localId, {
      thumbnailKey: undefined,
      thumbnailUrl: undefined,
      thumbnailPreviewUrl: undefined,
      isDirty: true,
    });
  }, [updateProject]);

  const handleImageRemove = useCallback(
    (localId: string, index: number) => {
      setProjects((prev) =>
        prev.map((item) => {
          if (item.localId !== localId) return item;
          const previews = [...(item.imagePreviewUrls ?? [])];
          const urls = [...(item.imageUrls ?? [])];
          const keys = [...item.imageKeys];
          if (index < previews.length) {
            previews.splice(index, 1);
          } else {
            const serverIndex = index - previews.length;
            if (serverIndex >= 0 && serverIndex < urls.length) {
              urls.splice(serverIndex, 1);
              if (serverIndex < keys.length) keys.splice(serverIndex, 1);
            }
          }
          return {
            ...item,
            imagePreviewUrls: previews,
            imageUrls: urls,
            imageKeys: keys,
            isDirty: true,
          };
        }),
      );
      notifyDirty(true);
    },
    [notifyDirty],
  );

  const addProject = () => {
    setProjects((prev) => [...prev, createEmptyProject()]);
    notifyDirty(true);
  };

  const loadingText = useMemo(() => {
    if (!loading) return null;
    return '불러오는 중...';
  }, [loading]);

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
          onClick={addProject}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          프로젝트 추가
        </button>
      </div>

      {loadingText && (
        <p className="mt-4 text-sm text-slate-500">{loadingText}</p>
      )}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      <div className="mt-6 space-y-6">
        {projects.map((item) => {
          const titleLabel = item.title.trim();
          const thumbnailSrc = item.thumbnailPreviewUrl ?? item.thumbnailUrl;
          const rawImages = [
            ...(item.imagePreviewUrls ?? []),
            ...(item.imageUrls ?? []),
          ];
          const imageUrls = Array.from(new Set(rawImages));
          const previewImages = imageUrls.slice(0, 4);
          const extraCount = imageUrls.length - previewImages.length;

          return (
            <div
              key={item.localId}
              id={`admin-project-${item.localId}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {titleLabel ? (
                    <span className="text-base font-bold text-slate-900">
                      {titleLabel}
                    </span>
                  ) : (
                    <span className="inline-flex h-4 w-32 rounded-full bg-slate-200/80" />
                  )}
                  {item.isDirty && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                      변경됨
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      updateProject(item.localId, {
                        status: e.target.value as AdminProjectStatus,
                      })
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50"
                    aria-label="프로젝트 삭제"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {item.validationError && (
                <p className="mt-3 text-xs font-semibold text-rose-600">
                  {item.validationError}
                </p>
              )}

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      프로젝트 제목
                    </p>
                    <input
                      value={item.title}
                      onChange={(e) =>
                        updateProject(item.localId, {
                          title: e.target.value,
                          validationError: null,
                        })
                      }
                      placeholder="프로젝트 제목을 입력하세요"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      마감일 (YYYY-MM-DD)
                    </p>
                    <input
                      value={item.deadlineDate}
                      onChange={(e) =>
                        updateProject(item.localId, {
                          deadlineDate: formatDateInput(e.target.value),
                          validationError: null,
                        })
                      }
                      placeholder="예: 2026-12-13"
                      inputMode="numeric"
                      pattern="\d*"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    한 줄 설명
                  </p>
                  <input
                    value={item.summary}
                    onChange={(e) =>
                      updateProject(item.localId, {
                        summary: e.target.value,
                        validationError: null,
                      })
                    }
                    placeholder="한 줄 설명을 입력하세요"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">상세 설명</p>
                  <textarea
                    value={item.description}
                    onChange={(e) =>
                      updateProject(item.localId, {
                        description: e.target.value,
                        validationError: null,
                      })
                    }
                    rows={4}
                    placeholder="상세 설명을 입력하세요"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      대표 이미지
                    </p>
                    {item.isUploadingThumbnail && (
                      <span className="text-xs font-semibold text-slate-400">
                        업로드 중...
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    대표 이미지는 1개만 업로드 가능해요.
                  </p>

                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files ?? []);
                      if (files.length) {
                        void handleThumbnailUpload(item.localId, [files[0]]);
                      }
                    }}
                    className={[
                      'mt-3 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-4 text-center text-xs font-semibold transition',
                      item.isUploadingThumbnail
                        ? 'pointer-events-none border-slate-200 text-slate-400 opacity-60'
                        : 'border-slate-200 text-slate-500 hover:border-primary/60 hover:text-primary',
                    ].join(' ')}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) {
                          void handleThumbnailUpload(item.localId, [files[0]]);
                        }
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                    {item.isUploadingThumbnail
                      ? '업로드 중...'
                      : '드래그 & 드롭 또는 클릭하여 업로드'}
                  </label>

                  {item.thumbnailUploadError && (
                    <p className="mt-2 text-xs text-rose-600">
                      {item.thumbnailUploadError}
                    </p>
                  )}

                  <div className="mt-3 relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {thumbnailSrc ? (
                      <>
                        <img
                          src={thumbnailSrc}
                          alt="대표 이미지 미리보기"
                          className="h-32 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleThumbnailClear(item.localId)}
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"
                          aria-label="대표 이미지 삭제"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="flex h-32 items-center justify-center text-xs font-semibold text-slate-400">
                        대표 이미지 없음
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      상세 이미지
                    </p>
                    <div className="flex items-center gap-2">
                      {item.isUploadingImages ? (
                        <span className="text-xs font-semibold text-slate-400">
                          업로드 중...
                        </span>
                      ) : imageUrls.length > 0 ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
                          {imageUrls.length}장
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files ?? []);
                      if (files.length) {
                        void handleImagesUpload(item.localId, files);
                      }
                    }}
                    className={[
                      'mt-3 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-4 text-center text-xs font-semibold transition',
                      item.isUploadingImages
                        ? 'pointer-events-none border-slate-200 text-slate-400 opacity-60'
                        : 'border-slate-200 text-slate-500 hover:border-primary/60 hover:text-primary',
                    ].join(' ')}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) {
                          void handleImagesUpload(item.localId, files);
                        }
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                    {item.isUploadingImages
                      ? '업로드 중...'
                      : '드래그 & 드롭 또는 클릭하여 업로드'}
                  </label>

                  {item.imageUploadError && (
                    <p className="mt-2 text-xs text-rose-600">
                      {item.imageUploadError}
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {previewImages.length > 0 ? (
                      previewImages.map((url, idx) => (
                        <div
                          key={`${item.localId}-img-${idx}`}
                          className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                        >
                          <img
                            src={url}
                            alt={`상세 이미지 ${idx + 1}`}
                            className="h-16 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleImageRemove(item.localId, idx)}
                            className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                          >
                            ✕
                          </button>
                          {idx === 3 && extraCount > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                              +{extraCount}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 flex h-16 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-xs font-semibold text-slate-400 sm:col-span-4">
                        업로드된 이미지가 없습니다
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}
