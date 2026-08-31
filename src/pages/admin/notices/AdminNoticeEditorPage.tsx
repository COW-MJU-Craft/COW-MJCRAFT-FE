import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Reveal from '../../../components/ui/Reveal';
import BackArrowIcon from '../../../components/ui/BackArrowIcon';
import MarkdownEditor from '../../../components/ui/MarkdownEditor';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import {
  adminNoticesApi,
  type AdminNoticeResponse,
} from '../../../api/adminNotices';
import { uploadToPresignedUrl } from '../../../api/adminProjects';
import { API_BASE } from '../../../api/client';

type ImageItem = {
  id: string;
  file?: File;
  key?: string;
  previewUrl?: string;
  isUploading?: boolean;
  error?: string | null;
};

type NoticeForm = {
  id?: string;
  title: string;
  content: string;
  images: ImageItem[];
  isDirty?: boolean;
  validationError?: string | null;
};

const MAX_IMAGES = 3;

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

function createEmpty(): NoticeForm {
  return { title: '', content: '', images: [], isDirty: true };
}

function toForm(notice: AdminNoticeResponse): NoticeForm {
  const keys = notice.imageKeys ?? [];
  const urls = notice.imageUrls ?? [];
  const length = Math.max(keys.length, urls.length);

  return {
    id: String(notice.id),
    title: notice.title ?? '',
    content: notice.content ?? '',
    images: Array.from({ length }).map((_, idx) => {
      const key = keys[idx];
      const previewUrl = urls[idx];
      return {
        id: `server-${key ?? previewUrl ?? idx}-${idx}`,
        key,
        previewUrl,
      };
    }),
    isDirty: false,
  };
}

const PUBLIC_ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');

function resolveLegacyImageUrl(key: string) {
  if (/^https?:\/\//i.test(key)) return key;
  const normalized = key.replace(/^\/+/, '');
  if (!normalized) return '';
  return PUBLIC_ASSET_BASE
    ? `${PUBLIC_ASSET_BASE}/${normalized}`
    : `/${normalized}`;
}

type SortableImageProps = {
  item: ImageItem;
  onRemove: (id: string) => void;
  onRetry?: (item: ImageItem) => void;
  isDeleting?: boolean;
};

function SortableImageCard({
  item,
  onRemove,
  onRetry,
  isDeleting = false,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  const src =
    item.previewUrl || (item.key ? resolveLegacyImageUrl(item.key) : '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-white',
        isDragging ? 'opacity-60' : '',
      ].join(' ')}
    >
      {src ? (
        <img src={src} alt="공지 이미지" className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-400">
          <span>이미지</span>
          {item.key && (
            <span className="max-w-[90%] truncate text-[9px] text-slate-500">
              {item.key}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={isDeleting}
        className={[
          'absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100',
          isDeleting ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
      >
        X
      </button>

      <button
        type="button"
        title="드래그해서 이미지 순서를 바꿔보세요"
        className="absolute left-1 top-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 opacity-0 transition group-hover:opacity-100"
        aria-label="이미지 순서 변경"
        {...attributes}
        {...listeners}
      >
        =
      </button>

      {item.isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-bold text-white">
          업로드 중...
        </div>
      )}

      {item.error && (
        <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 px-1 py-1 text-[10px] font-semibold text-white">
          {item.error}
        </div>
      )}

      {item.error && item.file && (
        <button
          type="button"
          onClick={() => onRetry?.(item)}
          className="absolute bottom-1 right-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow"
        >
          재시도
        </button>
      )}
    </div>
  );
}

export default function AdminNoticeEditorPage() {
  const navigate = useNavigate();
  const { noticeId } = useParams();
  const isEditMode = Boolean(noticeId);
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState<NoticeForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // isDirty(useMemo)가 렌더 중에 읽어야 하므로 ref 대신 state로 보관한다
  // (react-hooks/refs: 렌더 중 ref.current 읽기 금지).
  const [initialSnapshot, setInitialSnapshot] = useState<NoticeForm | null>(
    null,
  );
  const objectUrlsRef = useRef<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const createPreviewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  const revokePreviewUrl = useCallback((url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current = objectUrlsRef.current.filter(
      (item) => item !== url
    );
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
        if (!noticeId) {
          const empty = createEmpty();
          setForm(empty);
          setInitialSnapshot({ ...empty, images: [] });
          return;
        }
        const detail = await adminNoticesApi.getById(noticeId);
        if (!active) return;
        if (!detail) {
          setError('공지사항을 찾을 수 없어요.');
          setForm(null);
          return;
        }
        const mapped = toForm(detail);
        setForm(mapped);
        setInitialSnapshot({
          ...mapped,
          images: mapped.images.map((img) => ({ ...img })),
        });
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

  const updateForm = useCallback((patch: Partial<NoticeForm>) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, ...patch, isDirty: patch.isDirty ?? true };
    });
  }, []);

  const isDirty = useMemo(() => {
    if (!form || !initialSnapshot) return false;
    const a = JSON.stringify({
      title: initialSnapshot.title.trim(),
      content: initialSnapshot.content.trim(),
      images: initialSnapshot.images.map((i) => i.key ?? null),
    });
    const b = JSON.stringify({
      title: form.title.trim(),
      content: form.content.trim(),
      images: form.images.map((i) => i.key ?? null),
    });
    return a !== b;
  }, [form, initialSnapshot]);

  const handleBack = useCallback(async () => {
    if (!isDirty) {
      navigate('/admin/notices');
      return;
    }
    const ok = await confirm.open({
      title: '변경사항이 있어요',
      description: '저장하지 않고 나갈까요?',
      confirmText: '나가기',
      cancelText: '계속 편집',
    });
    if (ok) navigate('/admin/notices');
  }, [confirm, isDirty, navigate]);

  const handleUploadImages = useCallback(
    async (files: File[]) => {
      if (!form || !files.length) return;

      const remaining = MAX_IMAGES - form.images.length;
      if (remaining <= 0) {
        toast.error(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있어요.`);
        return;
      }

      const sliced = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.error(`최대 ${MAX_IMAGES}장까지 업로드할 수 있어요.`);
      }

      const items: ImageItem[] = sliced.map((file, idx) => ({
        id: `upload-${Date.now()}-${idx}`,
        file,
        previewUrl: createPreviewUrl(file),
        isUploading: true,
      }));

      setForm((prev) => {
        if (!prev) return prev;
        return { ...prev, images: [...prev.images, ...items], isDirty: true };
      });

      await Promise.all(
        items.map(async (item, idx) => {
          const file = sliced[idx];
          const contentType = file.type || 'application/octet-stream';
          try {
            const presign = await adminNoticesApi.presignImage({
              fileName: file.name,
              contentType,
            });
            await uploadToPresignedUrl(presign.uploadUrl, file, contentType);

            setForm((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                images: prev.images.map((img) =>
                  img.id === item.id
                    ? {
                        ...img,
                        key: presign.key,
                        isUploading: false,
                        error: null,
                        file: undefined,
                      }
                    : img
                ),
              };
            });
          } catch {
            setForm((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                images: prev.images.map((img) =>
                  img.id === item.id
                    ? { ...img, isUploading: false, error: '업로드 실패' }
                    : img
                ),
              };
            });
          }
        })
      );
    },
    [createPreviewUrl, form, toast]
  );

  const handleRetryImage = useCallback(async (item: ImageItem) => {
    if (!item.file) return;

    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        images: prev.images.map((img) =>
          img.id === item.id ? { ...img, isUploading: true, error: null } : img
        ),
      };
    });

    const contentType = item.file.type || 'application/octet-stream';

    try {
      const presign = await adminNoticesApi.presignImage({
        fileName: item.file.name,
        contentType,
      });
      await uploadToPresignedUrl(presign.uploadUrl, item.file, contentType);

      setForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === item.id
              ? {
                  ...img,
                  key: presign.key,
                  isUploading: false,
                  error: null,
                  file: undefined,
                }
              : img
          ),
        };
      });
    } catch {
      setForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === item.id
              ? { ...img, isUploading: false, error: '업로드 실패' }
              : img
          ),
        };
      });
    }
  }, []);

  const handleRemoveImage = useCallback(
    (id: string) => {
      setForm((prev) => {
        if (!prev) return prev;
        const target = prev.images.find((img) => img.id === id);
        if (target?.previewUrl) revokePreviewUrl(target.previewUrl);
        return {
          ...prev,
          images: prev.images.filter((img) => img.id !== id),
          isDirty: true,
        };
      });
    },
    [revokePreviewUrl]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setForm((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.images.findIndex((img) => img.id === active.id);
      const newIndex = prev.images.findIndex((img) => img.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const nextImages = arrayMove(prev.images, oldIndex, newIndex);
      return { ...prev, images: nextImages, isDirty: true };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!form) return;

    if (!form.title.trim() || !form.content.trim()) {
      updateForm({ validationError: '제목과 내용을 입력해주세요.' });
      return;
    }

    const hasUploading = form.images.some((img) => img.isUploading);
    if (hasUploading) {
      updateForm({ validationError: '이미지 업로드 완료 후 저장해 주세요.' });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        imageKeys: form.images
          .map((img) => img.key)
          .filter(Boolean) as string[],
      };

      if (isEditMode && form.id) {
        await adminNoticesApi.update(form.id, payload);
      } else {
        await adminNoticesApi.create(payload);
      }

      toast.success('저장했어요');
      navigate('/admin/notices');
    } catch {
      setError('저장에 실패했어요.');
      toast.error('저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  }, [form, isEditMode, navigate, toast, updateForm]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              공지사항 목록
            </button>
            <h1 className="mt-2 font-heading text-3xl text-primary">
              {isEditMode ? '공지사항 수정' : '공지사항 작성'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              공지사항을 등록하거나 수정할 수 있어요
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={[
              'rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition',
              saving || !isDirty ? 'opacity-60' : 'hover:opacity-95',
            ].join(' ')}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </Reveal>

      {form.validationError && (
        <p className="mt-4 text-sm font-semibold text-rose-600">
          {form.validationError}
        </p>
      )}

      <Reveal
        delayMs={120}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700">제목</label>
            <input
              value={form.title}
              onChange={(e) =>
                updateForm({ title: e.target.value, validationError: null })
              }
              className={`${INPUT_CLASS} mt-2`}
              placeholder="공지 제목을 입력해주세요"
            />
          </div>

          <div>
            <MarkdownEditor
              value={form.content}
              onChange={(next: string) =>
                updateForm({ content: next, validationError: null })
              }
              leftLabel="내용"
              rightLabel="미리보기"
              placeholder="공지 내용을 입력해주세요. (마크다운 지원: # 제목, - 목록, 굵게, 링크 등)"
              minHeightClassName="min-h-[200px] md:h-[280px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">이미지</label>
              <span className="text-xs font-semibold text-slate-500">
                {form.images.length}/{MAX_IMAGES}
              </span>
            </div>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files ?? []);
                  if (files.length) void handleUploadImages(files);
                }}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-xs font-semibold transition',
                  form.images.length >= MAX_IMAGES
                    ? 'border-slate-200 text-slate-300'
                    : 'border-slate-200 text-slate-500 hover:border-primary/60 hover:text-primary',
                ].join(' ')}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={form.images.length >= MAX_IMAGES}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void handleUploadImages(files);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                {form.images.length >= MAX_IMAGES
                  ? `최대 ${MAX_IMAGES}장까지 업로드 가능`
                  : '드래그하거나 클릭해서 이미지 업로드'}
              </label>

              {form.images.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.images.map((img) => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {form.images.map((img) => (
                        <SortableImageCard
                          key={img.id}
                          item={img}
                          onRemove={handleRemoveImage}
                          onRetry={handleRetryImage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
