import { useCallback, useEffect, useRef, useState } from 'react';
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
  adminProjectsApi,
  uploadToPresignedUrl,
  type AdminProjectCategory,
  type AdminProjectResponse,
  type AdminProjectStatus,
  type PresignPutItem,
} from '../../../api/adminProjects';

type ValidationField =
  | 'title'
  | 'deadline'
  | 'summary'
  | 'description'
  | 'thumbnail';

type ValidationResult = { field: ValidationField; message: string };

type ImageItem = {
  id: string;
  file?: File;
  key?: string;
  url?: string;
  previewUrl?: string;
  isUploading?: boolean;
  error?: string | null;
};

type AdminProjectForm = {
  id?: string;
  title: string;
  summary: string;
  description: string;
  status: AdminProjectStatus;
  category: AdminProjectCategory;
  deadlineDate: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  thumbnailPreviewUrl?: string;
  images: ImageItem[];
  isDirty?: boolean;
  isUploadingThumbnail?: boolean;
  thumbnailUploadError?: string | null;
  imageUploadError?: string | null;
  validationError?: string | null;
};

const STATUS_OPTIONS: { label: string; value: AdminProjectStatus }[] = [
  { label: '준비중', value: 'PREPARING' },
  { label: '진행중', value: 'OPEN' },
  { label: '마감', value: 'CLOSED' },
];
const CATEGORY_OPTIONS: { label: string; value: AdminProjectCategory }[] = [
  { label: '상품 (GOODS)', value: 'GOODS' },
  { label: '저널 (JOURNAL)', value: 'JOURNAL' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';
const FORM_LABEL_CLASS = 'text-sm font-bold text-slate-700';

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
    return `${String(year).padStart(4, '0')}-${String(month).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`;
  }

  return '';
}

function createEmptyProject(): AdminProjectForm {
  return {
    title: '',
    summary: '',
    description: '',
    status: 'PREPARING',
    category: 'GOODS',
    deadlineDate: '',
    images: [],
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

function buildImageItems(
  keys?: string[] | null,
  urls?: string[] | null
): ImageItem[] {
  const safeKeys = keys ?? [];
  const safeUrls = urls ?? [];
  const length = Math.max(safeKeys.length, safeUrls.length);
  return Array.from({ length }, (_, idx) => ({
    id: `server-${safeKeys[idx] ?? safeUrls[idx] ?? idx}`,
    key: safeKeys[idx] ?? undefined,
    url: safeUrls[idx] ?? undefined,
  }));
}

function mapProjectToForm(project: AdminProjectResponse): AdminProjectForm {
  return {
    id: String(project.id ?? ''),
    title: project.title ?? '',
    summary: project.summary ?? '',
    description: project.description ?? '',
    status: project.status,
    category: project.category ?? 'GOODS',
    deadlineDate: toIsoDate(project.deadlineDate ?? ''),
    thumbnailKey: project.thumbnailKey ?? '',
    thumbnailUrl: project.thumbnailUrl ?? undefined,
    images: buildImageItems(project.imageKeys, project.imageUrls),
    isDirty: false,
  };
}

function mergeServerProject(
  form: AdminProjectForm,
  saved: AdminProjectResponse | null
): AdminProjectForm {
  if (!saved) return { ...form, isDirty: false };

  const hasThumbnailUrl = Boolean(saved.thumbnailUrl);

  return {
    ...form,
    id: String(saved.id ?? form.id ?? ''),
    title: saved.title ?? form.title,
    summary: saved.summary ?? form.summary,
    description: saved.description ?? form.description,
    status: saved.status ?? form.status,
    category: saved.category ?? form.category,
    deadlineDate: toIsoDate(saved.deadlineDate ?? form.deadlineDate),
    thumbnailKey: saved.thumbnailKey ?? form.thumbnailKey,
    thumbnailUrl: saved.thumbnailUrl ?? form.thumbnailUrl,
    images: buildImageItems(saved.imageKeys, saved.imageUrls),
    thumbnailPreviewUrl: hasThumbnailUrl ? undefined : form.thumbnailPreviewUrl,
    isDirty: false,
    thumbnailUploadError: null,
    imageUploadError: null,
    validationError: null,
  };
}

function matchPresignItems(
  files: File[],
  items: PresignPutItem[]
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

type SortableImageProps = {
  item: ImageItem;
  onRemove: (id: string) => void;
  isDeleting?: boolean;
};

function SortableImageCard({
  item,
  onRemove,
  isDeleting = false,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as const;

  const src = item.previewUrl ?? item.url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100',
        isDragging ? 'opacity-60' : '',
        isOver ? 'ring-2 ring-primary/30' : '',
      ].join(' ')}
    >
      {src ? (
        <img
          src={src}
          alt="상세 이미지 미리보기"
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="flex h-28 items-center justify-center text-[10px] font-semibold text-slate-400">
          이미지가 없어요
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
        ✕
      </button>

      <button
        type="button"
        className="absolute left-1 top-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 opacity-0 transition group-hover:opacity-100"
        aria-label="이미지 순서 변경"
        {...attributes}
        {...listeners}
      >
        ⠿
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
    </div>
  );
}

export default function AdminProjectEditorPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const isEditMode = Boolean(projectId);
  const confirm = useConfirm();
  const toast = useToast();

  const [project, setProject] = useState<AdminProjectForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailDeleting, setThumbnailDeleting] = useState(false);
  const [deletingImageIds, setDeletingImageIds] = useState<string[]>([]);
  // 렌더 중 isDirtyBySnapshot()에서 읽어야 하므로 ref 대신 state로 보관한다
  // (react-hooks/refs: 렌더 중 ref.current 읽기 금지).
  const [initialProjectSnapshot, setInitialProjectSnapshot] =
    useState<AdminProjectForm | null>(null);

  const objectUrlsRef = useRef<string[]>([]);

  const fieldRefs = useRef<Record<ValidationField, HTMLDivElement | null>>({
    title: null,
    deadline: null,
    summary: null,
    description: null,
    thumbnail: null,
  });

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
    // 프로젝트 전환 시 기준 스냅샷 초기화: 외부 상태(projectId)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialProjectSnapshot(null);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (!projectId) {
          if (active) {
            const empty = createEmptyProject();
            setProject(empty);
            setInitialProjectSnapshot((prev) => prev ?? { ...empty, images: [] });
          }
          return;
        }

        const detail = await adminProjectsApi.getById(projectId);
        if (!active) return;
        if (!detail) {
          setError('프로젝트를 찾을 수 없어요');
          setProject(null);
          return;
        }
        const mapped = mapProjectToForm(detail);
        setProject(mapped);
        setInitialProjectSnapshot(
          (prev) =>
            prev ?? {
              ...mapped,
              images: mapped.images.map((image) => ({ ...image })),
            },
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : '로드에 실패했어요');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [projectId]);

  const updateProject = useCallback((patch: Partial<AdminProjectForm>) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
        isDirty: patch.isDirty ?? true,
      };
    });
  }, []);

  const updateImageItem = useCallback(
    (id: string, patch: Partial<ImageItem>) => {
      setProject((prev) => {
        if (!prev) return prev;
        const images = prev.images.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        );
        return { ...prev, images, isDirty: true };
      });
    },
    []
  );

  const snapshotProject = useCallback((value: AdminProjectForm | null) => {
    if (!value) return null;
    return {
      id: value.id ?? null,
      title: value.title.trim(),
      summary: value.summary.trim(),
      description: value.description.trim(),
      status: value.status,
      category: value.category,
      deadlineDate: value.deadlineDate.trim(),
      thumbnailKey: value.thumbnailKey ?? null,
      imageKeys: value.images.map((image) => image.key ?? null),
    };
  }, []);

  const isDirtyBySnapshot = useCallback(
    (current: AdminProjectForm | null) => {
      const initial = snapshotProject(initialProjectSnapshot);
      const now = snapshotProject(current);
      return JSON.stringify(initial) !== JSON.stringify(now);
    },
    [snapshotProject, initialProjectSnapshot]
  );

  const getValidation = useCallback(
    (item: AdminProjectForm): ValidationResult | null => {
      if (!item.title.trim())
        return { field: 'title', message: '프로젝트 명을 입력해주세요' };
      if (!item.deadlineDate.trim())
        return { field: 'deadline', message: '마감일을 입력해주세요' };
      if (!item.summary.trim())
        return { field: 'summary', message: '한 줄 설명을 입력해주세요' };
      if (!item.description.trim())
        return { field: 'description', message: '상세 설명을 입력해주세요' };
      if (!isEditMode && !item.thumbnailKey?.trim()) {
        return { field: 'thumbnail', message: '대표 이미지를 업로드해주세요' };
      }
      if (!item.status)
        return { field: 'title', message: '상태를 선택해주세요' };
      return null;
    },
    [isEditMode]
  );

  const buildPayload = useCallback((item: AdminProjectForm) => {
    const imageKeys = item.images
      .map((image) => image.key)
      .filter((key): key is string => Boolean(key));

    return {
      title: item.title.trim(),
      summary: item.summary.trim(),
      description: item.description.trim(),
      status: item.status,
      category: item.category,
      deadlineDate: item.deadlineDate.trim(),
      thumbnailKey: item.thumbnailKey?.trim() ?? '',
      imageKeys: imageKeys.length ? imageKeys : undefined,
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!project) return;

    const isUploading =
      project.isUploadingThumbnail ||
      project.images.some((img) => img.isUploading);
    if (isUploading) {
      setError('이미지 업로드가 완료된 후 저장할 수 있어요');
      return;
    }

    const validation = getValidation(project);
    if (validation) {
      updateProject({ validationError: validation.message });
      const target = fieldRefs.current[validation.field];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = buildPayload(project);
      const saved = isEditMode
        ? await adminProjectsApi.updateProject(String(projectId), payload)
        : await adminProjectsApi.createProject(payload);

      setProject((prev) => {
        if (!prev) return prev;

        // save 성공 시: 남아있는 ObjectURL 정리
        prev.images.forEach((img) => {
          if (img.previewUrl) revokePreviewUrl(img.previewUrl);
        });
        if (prev.thumbnailPreviewUrl)
          revokePreviewUrl(prev.thumbnailPreviewUrl);

        const merged = mergeServerProject(prev, saved);
        setInitialProjectSnapshot({
          ...merged,
          images: merged.images.map((image) => ({ ...image })),
        });
        return merged;
      });

      toast.success('저장했어요');
      if (!isEditMode) {
        window.setTimeout(() => {
          navigate('/admin/projects');
        }, 700);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했어요';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    buildPayload,
    getValidation,
    isEditMode,
    navigate,
    project,
    projectId,
    revokePreviewUrl,
    toast,
    updateProject,
  ]);

  const handleThumbnailUpload = useCallback(
    async (files: File[]) => {
      if (!project || !files.length) return;
      const file = files[0];
      const contentType = resolveContentType(file);

      // 새 프리뷰 만들기 전에 기존 프리뷰 있으면 정리
      if (project.thumbnailPreviewUrl)
        revokePreviewUrl(project.thumbnailPreviewUrl);

      const previewUrl = createPreviewUrl(file);
      updateProject({
        thumbnailPreviewUrl: previewUrl,
        isUploadingThumbnail: true,
        thumbnailUploadError: null,
      });

      try {
        const res = await adminProjectsApi.presignThumbnail({
          files: [{ fileName: file.name, contentType }],
        });

        const target = res.items?.[0];
        if (!target) throw new Error('업로드 URL이 없어요');

        await uploadToPresignedUrl(target.uploadUrl, file, contentType);

        // 업로드 성공: key 반영
        updateProject({
          thumbnailKey: target.key,
          thumbnailUploadError: null,
        });
      } catch (err) {
        updateProject({
          thumbnailUploadError:
            err instanceof Error ? err.message : '업로드에 실패했어요',
        });
      } finally {
        updateProject({ isUploadingThumbnail: false, isDirty: true });
      }
    },
    [createPreviewUrl, project, revokePreviewUrl, updateProject]
  );

  const handleImagesUpload = useCallback(
    async (files: File[]) => {
      if (!project || !files.length) return;

      const filesToUpload = files;

      const now = Date.now();
      const uploadItems = filesToUpload.map((file, idx) => ({
        id: `upload-${now}-${idx}`,
        file,
      }));

      setProject((prev) => {
        if (!prev) return prev;
        const newImages: ImageItem[] = uploadItems.map(({ id, file }) => ({
          id,
          file,
          previewUrl: createPreviewUrl(file),
          isUploading: true,
        }));
        return {
          ...prev,
          images: [...prev.images, ...newImages],
          imageUploadError: null,
          isDirty: true,
        };
      });

      const payloadFiles = uploadItems.map(({ file }) => ({
        fileName: file.name,
        contentType: resolveContentType(file),
      }));

      try {
        const res = await adminProjectsApi.presignImages({
          files: payloadFiles,
        });
        const items = res.items ?? [];
        const matched = matchPresignItems(
          uploadItems.map((i) => i.file),
          items
        );

        await Promise.all(
          matched.map(async (target, idx) => {
            const uploadItem = uploadItems[idx];
            try {
              await uploadToPresignedUrl(
                target.uploadUrl,
                uploadItem.file,
                payloadFiles[idx].contentType
              );
              updateImageItem(uploadItem.id, {
                key: target.key,
                isUploading: false,
                error: null,
                file: undefined,
              });
            } catch (err) {
              updateImageItem(uploadItem.id, {
                isUploading: false,
                error:
                  err instanceof Error ? err.message : '업로드에 실패했어요',
              });
            }
          })
        );
      } catch (err) {
        updateProject({
          imageUploadError:
            err instanceof Error ? err.message : '업로드에 실패했어요',
        });
        uploadItems.forEach((item) => {
          updateImageItem(item.id, {
            isUploading: false,
            error: '업로드에 실패했어요',
          });
        });
      }
    },
    [createPreviewUrl, project, updateImageItem, updateProject]
  );

  const handleThumbnailClear = useCallback(async () => {
    if (thumbnailDeleting) return;
    const ok = await confirm.open({
      title: '대표 이미지 삭제',
      description: '대표 이미지를 삭제할까요? 삭제 후 재등록 해야 해요.',
      danger: true,
      confirmText: '삭제',
    });
    if (!ok) return;

    setThumbnailDeleting(true);
    if (project?.thumbnailPreviewUrl)
      revokePreviewUrl(project.thumbnailPreviewUrl);

    updateProject({
      thumbnailKey: '',
      thumbnailUrl: undefined,
      thumbnailPreviewUrl: undefined,
      isDirty: true,
    });
    // TODO: 서버 삭제 API가 생기면 여기서 호출로 교체
    toast.success('삭제했어요. 저장하면 반영돼요');
    setThumbnailDeleting(false);
    // React Compiler가 project?.thumbnailPreviewUrl 같은 optional chaining 경로를
    // 안정적으로 추적하지 못해 메모이제이션을 보존할 수 없다는 경고가 발생한다.
    // project 객체 자체를 의존성으로 사용해 컴파일러 추론과 일치시킨다.
  }, [confirm, project, revokePreviewUrl, thumbnailDeleting, toast, updateProject]);

  const handleImageRemove = useCallback(
    async (id: string) => {
      if (deletingImageIds.includes(id)) return;
      const ok = await confirm.open({
        title: '이미지 삭제',
        description: '이 이미지를 삭제할까요? 삭제 후 재등록 해야 해요.',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;

      setDeletingImageIds((prev) => [...prev, id]);
      setProject((prev) => {
        if (!prev) return prev;
        const target = prev.images.find((item) => item.id === id);
        if (target?.previewUrl) revokePreviewUrl(target.previewUrl);
        const images = prev.images.filter((item) => item.id !== id);
        return { ...prev, images, isDirty: true };
      });
      toast.success('이미지를 목록에서 제거했어요! 저장하면 반영돼요');
      setDeletingImageIds((prev) => prev.filter((imageId) => imageId !== id));
    },
    [confirm, deletingImageIds, revokePreviewUrl, toast]
  );

  const handleImageRetry = useCallback(
    async (item: ImageItem) => {
      if (!item.file) return;

      updateImageItem(item.id, { isUploading: true, error: null });

      try {
        const contentType = resolveContentType(item.file);
        const res = await adminProjectsApi.presignImages({
          files: [{ fileName: item.file.name, contentType }],
        });

        const target = res.items?.[0];
        if (!target) throw new Error('업로드 URL이 없어요');

        await uploadToPresignedUrl(target.uploadUrl, item.file, contentType);

        updateImageItem(item.id, {
          key: target.key,
          isUploading: false,
          error: null,
          file: undefined,
        });
      } catch (err) {
        updateImageItem(item.id, {
          isUploading: false,
          error: err instanceof Error ? err.message : '업로드에 실패했어요',
        });
      }
    },
    [updateImageItem]
  );

  const handleImageDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProject((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.images.findIndex((item) => item.id === active.id);
      const newIndex = prev.images.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const nextImages = arrayMove(prev.images, oldIndex, newIndex);
      return { ...prev, images: nextImages, isDirty: true };
    });
  }, []);

  const handleBack = useCallback(async () => {
    if (!isDirtyBySnapshot(project)) {
      navigate('/admin/projects');
      return;
    }

    const ok = await confirm.open({
      title: '변경사항이 있어요',
      description: '저장하지 않고 나갈까요?',
      confirmText: '나가기',
      cancelText: '계속 편집',
    });
    if (ok) {
      navigate('/admin/projects');
    }
  }, [confirm, isDirtyBySnapshot, navigate, project]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-slate-500">불러오는 중...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!project) return null;

  const titleLabel = project.title.trim();
  const thumbnailSrc = project.thumbnailPreviewUrl ?? project.thumbnailUrl;

  const isUploading =
    project.isUploadingThumbnail ||
    project.images.some((img) => img.isUploading);
  const hasChanges = isDirtyBySnapshot(project);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-12">
      <Reveal>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              프로젝트 목록
            </button>
            <h1 className="mt-2 font-heading text-3xl text-primary">
              {isEditMode ? '프로젝트 관리' : '프로젝트 추가'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {isEditMode
                ? '프로젝트 정보를 편집할 수 있어요'
                : '새 프로젝트를 등록할 수 있어요'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || isUploading || !hasChanges}
              className={[
                'rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition',
                saving || isUploading || !hasChanges
                  ? 'opacity-60'
                  : 'hover:opacity-95',
              ].join(' ')}
            >
              {saving ? '저장 중...' : isUploading ? '업로드 중...' : '저장'}
            </button>
          </div>
        </div>
      </Reveal>

      {error && (
        <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
      )}

      <Reveal
        delayMs={120}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
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

            {hasChanges && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                변경됨
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={project.status}
              onChange={(e) => updateProject({ status: e.target.value as AdminProjectStatus })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {project.validationError && (
          <p className="mt-3 text-xs font-semibold text-rose-600">
            {project.validationError}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              ref={(node) => {
                fieldRefs.current.title = node;
              }}
              className="space-y-2"
            >
              <label className={FORM_LABEL_CLASS}>프로젝트 명</label>
              <input
                value={project.title}
                onChange={(e) =>
                  updateProject({
                    title: e.target.value,
                    validationError: null,
                  })
                }
                placeholder="프로젝트 명을 입력해주세요"
                className={INPUT_CLASS}
              />
            </div>

            <div
              ref={(node) => {
                fieldRefs.current.deadline = node;
              }}
              className="space-y-2"
            >
              <label className={FORM_LABEL_CLASS}>마감일</label>
              <input
                type="date"
                value={project.deadlineDate}
                onChange={(e) =>
                  updateProject({
                    deadlineDate: e.target.value,
                    validationError: null,
                  })
                }
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={FORM_LABEL_CLASS}>프로젝트 카테고리</label>
            <select
              value={project.category}
              onChange={(e) =>
                updateProject({
                  category: e.target.value as AdminProjectCategory,
                  validationError: null,
                })
              }
              className={INPUT_CLASS}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              저널 파일 업로드를 사용하려면 카테고리를 <b>저널(JOURNAL)</b>로 저장해야 해요.
            </p>
          </div>

          <div
            ref={(node) => {
              fieldRefs.current.summary = node;
            }}
            className="space-y-2"
          >
            <label className={FORM_LABEL_CLASS}>한 줄 설명</label>
            <input
              value={project.summary}
              onChange={(e) =>
                updateProject({
                  summary: e.target.value,
                  validationError: null,
                })
              }
              placeholder="한 줄 설명을 입력해주세요"
              className={INPUT_CLASS}
            />
          </div>

          <div
            ref={(node) => {
              fieldRefs.current.description = node;
            }}
          >
            <MarkdownEditor
              value={project.description}
              onChange={(next: string) =>
                updateProject({ description: next, validationError: null })
              }
              leftLabel="상세 설명"
              rightLabel="미리보기"
              placeholder="상세 설명을 입력해주세요. (마크다운 지원: # 제목, - 목록, 굵게, 링크 등)"
              minHeightClassName="min-h-[240px] md:h-[360px]"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            ref={(node) => {
              fieldRefs.current.thumbnail = node;
            }}
            className="rounded-2xl bg-slate-50/70 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                대표 이미지
              </p>
              {project.isUploadingThumbnail && (
                <span className="text-xs font-semibold text-slate-400">
                  업로드 중...
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-400">
              대표 이미지는 1개만 등록할 수 있어요
            </p>

            {!thumbnailSrc && (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files ?? []);
                  if (files.length) void handleThumbnailUpload([files[0]]);
                }}
                className={[
                  'mt-3 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-4 text-center text-xs font-semibold transition',
                  project.isUploadingThumbnail
                    ? 'pointer-events-none border-slate-200 text-slate-400 opacity-60'
                    : 'border-slate-200 text-slate-500 hover:border-primary/60 hover:text-primary',
                ].join(' ')}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void handleThumbnailUpload([files[0]]);
                    e.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                {project.isUploadingThumbnail
                  ? '업로드 중...'
                  : '드래그 & 드롭하거나 클릭해서 업로드해주세요'}
              </label>
            )}

            {!thumbnailSrc && (
              <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-xs font-semibold text-slate-400">
                업로드된 이미지가 없어요
              </div>
            )}

            {project.thumbnailUploadError && (
              <p className="mt-2 text-xs text-rose-600">
                {project.thumbnailUploadError}
              </p>
            )}

            {thumbnailSrc && (
              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <img
                  src={thumbnailSrc}
                  alt="대표 이미지 미리보기"
                  className="h-56 w-full object-cover"
                />
                <div className="flex items-center justify-end gap-2 border-t border-slate-200/60 bg-white px-4 py-3">
                  <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    교체
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length)
                          void handleThumbnailUpload([files[0]]);
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleThumbnailClear}
                    disabled={thumbnailDeleting}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {thumbnailDeleting ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                상세 이미지
              </p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500">
                현재 {project.images.length}장 업로드됨
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-400">
              상세 이미지는 여러 장 등록할 수 있어요
            </p>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files ?? []);
                if (files.length) void handleImagesUpload(files);
              }}
              className="mt-3 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-4 py-4 text-center text-xs font-semibold text-slate-500 transition hover:border-primary/60 hover:text-primary"
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) void handleImagesUpload(files);
                  e.currentTarget.value = '';
                }}
                className="hidden"
              />
              {isUploading
                ? '업로드 중...'
                : '드래그 & 드롭하거나 클릭해서 업로드해주세요'}
            </label>

            {project.imageUploadError && (
              <p className="mt-2 text-xs text-rose-600">
                {project.imageUploadError}
              </p>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleImageDragEnd}
            >
              <SortableContext
                items={project.images.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {project.images.length > 0 ? (
                    project.images.map((item) => (
                      <div key={item.id} className="relative">
                        <SortableImageCard
                          item={item}
                          onRemove={handleImageRemove}
                          isDeleting={deletingImageIds.includes(item.id)}
                        />
                        {item.error && item.file && (
                          <button
                            type="button"
                            onClick={() => void handleImageRetry(item)}
                            className="absolute bottom-1 right-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow"
                          >
                            재시도
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-xs font-semibold text-slate-400">
                      업로드된 이미지가 없어요
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
