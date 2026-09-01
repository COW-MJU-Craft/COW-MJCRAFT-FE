import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DropAnimation,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Reveal from '../../../components/ui/Reveal';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import {
  adminProjectsApi,
  type AdminProjectOrderItem,
  type AdminProjectResponse,
} from '../../../api/admin/projects';
import { sortProjects } from '../../../utils/project/sort';
import { formatYmd } from '../../../utils/common/date';

const STATUS_LABELS: Record<string, string> = {
  PREPARING: '준비중',
  OPEN: '진행중',
  CLOSED: '마감',
};

type SortableRowProps = {
  project: AdminProjectResponse;
  onPinToggle: (project: AdminProjectResponse) => void;
  onDelete: (project: AdminProjectResponse) => void;
  deleting?: boolean;
};

type PinIconProps = {
  filled: boolean;
  className?: string;
};

function PinIcon({ filled, className }: PinIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path
        d="M6.2 3.5h7.6l-1.2 4.6 2.2 2.2v1.5H5.2v-1.5l2.2-2.2-1.2-4.6Z"
        strokeLinejoin="round"
      />
      <path d="M10 11.8v4.7" strokeLinecap="round" />
    </svg>
  );
}

type RowViewProps = {
  project: AdminProjectResponse;
  onPinToggle?: (project: AdminProjectResponse) => void;
  onDelete?: (project: AdminProjectResponse) => void;
  deleting?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  rowStyle?: CSSProperties;
  rowRef?: (node: HTMLTableRowElement | null) => void;
  isDragging?: boolean;
  isOver?: boolean;
  showActions?: boolean;
  rowClassName?: string;
};

function RowView({
  project,
  onPinToggle,
  onDelete,
  deleting = false,
  dragHandleProps,
  rowStyle,
  rowRef,
  isOver,
  showActions = true,
  rowClassName,
}: RowViewProps) {
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const deadline = formatYmd(project.deadlineDate);

  const pinClasses = project.pinned
    ? 'text-primary hover:text-primary/80'
    : 'text-slate-400 hover:text-slate-600';

  return (
    <tr
      ref={rowRef}
      style={rowStyle}
      className={[
        'rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-200/60',
        'transition-[box-shadow,opacity,ring-color] will-change-transform',
        isOver ? 'ring-2 ring-primary/30' : '',
        'hover:ring-primary/20',
        'h-16',
        rowClassName,
      ].join(' ')}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
            aria-label="드래그해서 순서 변경"
            {...dragHandleProps}
          >
            ⠿
          </button>

          <button
            type="button"
            onClick={() => onPinToggle?.(project)}
            aria-label={project.pinned ? '고정 해제' : '고정하기'}
            className="rounded-lg border border-transparent p-1 transition"
          >
            <PinIcon filled={Boolean(project.pinned)} className={`h-4 w-4 ${pinClasses}`} />
          </button>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="h-12 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {project.thumbnailUrl ? (
            <img src={project.thumbnailUrl} alt={project.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
              대표 이미지 없음
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{project.title}</p>
        <p className="text-xs text-slate-500">{project.summary}</p>
      </td>

      <td className="px-4 py-3">
        <span
          className={[
            'inline-flex rounded-full px-2 py-1 text-xs font-bold',
            project.status === 'OPEN'
              ? 'bg-emerald-50 text-emerald-600'
              : project.status === 'PREPARING'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-rose-50 text-rose-600',
          ].join(' ')}
        >
          {statusLabel}
        </span>
      </td>

      <td className="px-4 py-3 text-sm text-slate-600">{deadline || '-'}</td>

      <td className="px-4 py-3 text-right">
        {showActions && (
          <div className="flex flex-nowrap justify-end gap-2">
            <Link
              to={`/admin/projects/${project.id}/items`}
              className="whitespace-nowrap rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
            >
              상품 관리
            </Link>
            <Link
              to={`/admin/projects/${project.id}/edit`}
              className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              수정
            </Link>

            <button
              type="button"
              onClick={() => void onDelete?.(project)}
              disabled={deleting}
              className="whitespace-nowrap rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function SortableRow({ project, onPinToggle, onDelete, deleting = false }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: String(project.id) });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  } as const;

  return (
    <RowView
      project={project}
      onPinToggle={onPinToggle}
      onDelete={onDelete}
      deleting={deleting}
      dragHandleProps={{ ...attributes, ...listeners }}
      rowRef={setNodeRef}
      rowStyle={style}
      isOver={isOver}
      rowClassName={isDragging ? 'opacity-0' : undefined}
    />
  );
}

function applyOrdering(pinned: AdminProjectResponse[], unpinned: AdminProjectResponse[]) {
  const pinnedOrdered = pinned.map((project, index) => ({
    ...project,
    pinned: true,
    pinnedOrder: index + 1,
    manualOrder: null,
  }));

  const unpinnedOrdered = unpinned.map((project, index) => ({
    ...project,
    pinned: false,
    pinnedOrder: null,
    manualOrder: index + 1,
  }));

  return [...pinnedOrdered, ...unpinnedOrdered];
}

function buildPinnedOrderItems(list: AdminProjectResponse[]): AdminProjectOrderItem[] {
  return list.map((project, index) => ({
    projectId: project.id,
    pinned: true,
    pinnedOrder: index + 1,
  }));
}

function buildUnpinnedOrderItems(list: AdminProjectResponse[]): AdminProjectOrderItem[] {
  return list.map((project, index) => ({
    projectId: project.id,
    pinned: false,
    manualOrder: index + 1,
  }));
}

export default function AdminProjectsListPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [projects, setProjects] = useState<AdminProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [tableWidth, setTableWidth] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await adminProjectsApi.list();
      const sorted = sortProjects(list ?? []);
      setProjects(sorted);
    } catch (err) {
      console.error(err);
      setError('프로젝트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 프로젝트 목록 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);

  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const node = tableRef.current;
    const updateWidth = () => setTableWidth(node.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pinnedProjects = useMemo(() => projects.filter((p) => p.pinned), [projects]);
  const unpinnedProjects = useMemo(() => projects.filter((p) => !p.pinned), [projects]);

  const persistOrderOptimistic = useCallback(async (
    next: AdminProjectResponse[],
    prev: AdminProjectResponse[],
    items: AdminProjectOrderItem[],
    refreshAfter = false,
  ) => {
    if (savingOrder) return;
    setSavingOrder(true);
    setProjects(next);
    try {
      await adminProjectsApi.updateOrder({ items });
      if (refreshAfter) {
        await loadProjects();
      }
    } catch (err) {
      console.error(err);
      setProjects(prev);
      setError('순서 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingOrder(false);
    }
  }, [loadProjects, savingOrder]);

  const handleDelete = useCallback(
    async (project: AdminProjectResponse) => {
      if (!project.id || deleting) return;
      const message = '프로젝트를 삭제할까요? 삭제 후 재등록 해야 해요.';

      const ok = await confirm.open({
        title: '프로젝트 삭제',
        description: message,
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;

      const prev = projects;
      const targetId = project.id;
      setDeleting(true);

      try {
        await adminProjectsApi.deleteProject(String(targetId));
        const remaining = prev.filter((item) => item.id !== targetId);
        setProjects(remaining);
        await loadProjects();
        toast.success('프로젝트가 삭제됐어요');
      } catch (err) {
        console.error(err);
        setError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
        toast.error('삭제에 실패했어요');
      } finally {
        setDeleting(false);
      }
    },
    [confirm, deleting, loadProjects, projects, toast],
  );

  const handlePinToggle = useCallback(
    async (project: AdminProjectResponse) => {
      if (savingOrder) return;
      const prev = projects;
      const targetId = project.id;
      if (!targetId) return;

      let nextPinned = pinnedProjects;
      let nextUnpinned = unpinnedProjects;

      if (project.pinned) {
        nextPinned = pinnedProjects.filter((item) => item.id !== targetId);
        nextUnpinned = [
          ...unpinnedProjects,
          { ...project, pinned: false, pinnedOrder: null },
        ];
      } else {
        nextUnpinned = unpinnedProjects.filter((item) => item.id !== targetId);
        nextPinned = [
          ...pinnedProjects,
          { ...project, pinned: true, manualOrder: null },
        ];
      }

      const next = applyOrdering(nextPinned, nextUnpinned);
      setSavingOrder(true);
      setProjects(next);

      try {
        await adminProjectsApi.updateOrder({
          items: [{ projectId: targetId, pinned: !project.pinned }],
        });
      } catch (err) {
        console.error(err);
        setProjects(prev);
        setError('순서 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSavingOrder(false);
      }
    },
    [pinnedProjects, projects, savingOrder, unpinnedProjects],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (savingOrder) return;
      if (!over || active.id === over.id) return;

      const activeProject = projects.find((item) => String(item.id) === active.id);
      if (!activeProject) return;

      const overProject = projects.find((item) => String(item.id) === over.id);
      if (!overProject) return;

      const sameGroup = Boolean(activeProject.pinned) === Boolean(overProject.pinned);
      if (!sameGroup) return;

      const groupList = activeProject.pinned ? pinnedProjects : unpinnedProjects;
      const oldIndex = groupList.findIndex((item) => String(item.id) === active.id);
      const newIndex = groupList.findIndex((item) => String(item.id) === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const nextGroup = arrayMove(groupList, oldIndex, newIndex);
      const prev = projects;

      const next = activeProject.pinned
        ? applyOrdering(nextGroup, unpinnedProjects)
        : applyOrdering(pinnedProjects, nextGroup);

      const items = activeProject.pinned
        ? buildPinnedOrderItems(nextGroup)
        : buildUnpinnedOrderItems(nextGroup);

      void persistOrderOptimistic(next, prev, items, false);
    },
    [pinnedProjects, persistOrderOptimistic, projects, savingOrder, unpinnedProjects],
  );

  const activeProject = useMemo(
    () => projects.find((item) => String(item.id) === activeId) ?? null,
    [activeId, projects],
  );

  const dropAnimation: DropAnimation = {
    duration: 180,
    easing: 'cubic-bezier(0.2, 0.6, 0.2, 1)',
  };

  const emptyState = useMemo(() => {
    if (loading) return '불러오는 중...';
    if (projects.length === 0) return '아직 등록된 프로젝트가 없어요.';
    return null;
  }, [loading, projects.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-primary">프로젝트 관리</h1>
            <p className="mt-2 text-sm text-slate-600">
              프로젝트 목록 및 상품을 관리하고 상세 편집으로 이동할 수 있어요
            </p>
          </div>

          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/admin/projects/new')}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
            >
              프로젝트 추가
            </button>
          )}
        </div>
      </Reveal>

      <Reveal delayMs={120} className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {emptyState ? (
          <div className="py-12 text-center text-sm text-slate-500">
            <p className="font-semibold">{emptyState}</p>
            {projects.length === 0 && (
              <button
                type="button"
                onClick={() => navigate('/admin/projects/new')}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
              >
                프로젝트 추가
              </button>
            )}
          </div>
        ) : (
          <>
            {error && projects.length > 0 && (
              <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p>
            )}

            <div className="space-y-5 md:hidden">
              <section className="space-y-3">
                <p className="text-xs font-semibold text-slate-400">고정 프로젝트</p>
                {pinnedProjects.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    고정된 프로젝트가 없습니다.
                  </div>
                ) : (
                  pinnedProjects.map((project) => {
                    const statusLabel = STATUS_LABELS[project.status] ?? project.status;
                    return (
                      <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {project.thumbnailUrl ? (
                              <img src={project.thumbnailUrl} alt={project.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                                없음
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{project.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{project.summary}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {statusLabel}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                마감일 {formatYmd(project.deadlineDate) || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePinToggle(project)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            고정 해제
                          </button>
                          <Link
                            to={`/admin/projects/${project.id}/items`}
                            className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary"
                          >
                            상품 관리
                          </Link>
                          <Link
                            to={`/admin/projects/${project.id}/edit`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            수정
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(project)}
                            disabled={deleting}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            {deleting ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>

              <section className="space-y-3">
                <p className="text-xs font-semibold text-slate-400">미고정 프로젝트</p>
                {unpinnedProjects.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    미고정 프로젝트가 없습니다.
                  </div>
                ) : (
                  unpinnedProjects.map((project) => {
                    const statusLabel = STATUS_LABELS[project.status] ?? project.status;
                    return (
                      <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {project.thumbnailUrl ? (
                              <img src={project.thumbnailUrl} alt={project.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                                없음
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{project.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{project.summary}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {statusLabel}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                마감일 {formatYmd(project.deadlineDate) || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePinToggle(project)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            고정하기
                          </button>
                          <Link
                            to={`/admin/projects/${project.id}/items`}
                            className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary"
                          >
                            상품 관리
                          </Link>
                          <Link
                            to={`/admin/projects/${project.id}/edit`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            수정
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(project)}
                            disabled={deleting}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            {deleting ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={(event) => setActiveId(String(event.active.id))}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
                modifiers={[restrictToVerticalAxis]}
              >
                <table
                  ref={tableRef}
                  className="w-full min-w-[760px] table-fixed border-separate border-spacing-y-3"
                >
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-4">순서</th>
                      <th className="px-4">대표 이미지</th>
                      <th className="px-4">프로젝트 명</th>
                      <th className="px-4">상태</th>
                      <th className="px-4">마감일</th>
                      <th className="px-4 text-right">관리</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-4 pt-2 text-xs text-slate-400">
                        고정 프로젝트
                      </td>
                    </tr>

                    <SortableContext
                      items={pinnedProjects.map((project) => String(project.id))}
                      strategy={verticalListSortingStrategy}
                    >
                      {pinnedProjects.map((project) => (
                        <SortableRow
                          key={project.id}
                          project={project}
                          onPinToggle={handlePinToggle}
                          onDelete={handleDelete}
                          deleting={deleting}
                        />
                      ))}
                    </SortableContext>

                    <tr>
                      <td colSpan={6} className="px-4 pt-4 text-xs text-slate-400">
                        미고정 프로젝트
                      </td>
                    </tr>

                    <SortableContext
                      items={unpinnedProjects.map((project) => String(project.id))}
                      strategy={verticalListSortingStrategy}
                    >
                      {unpinnedProjects.map((project) => (
                        <SortableRow
                          key={project.id}
                          project={project}
                          onPinToggle={handlePinToggle}
                          onDelete={handleDelete}
                          deleting={deleting}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>

                {typeof document !== 'undefined' &&
                  createPortal(
                    <DragOverlay dropAnimation={dropAnimation}>
                      {activeProject ? (
                        <div className="pointer-events-none" style={{ width: tableWidth || '100%', zIndex: 60 }}>
                          <table className="w-full table-fixed">
                            <tbody>
                              <RowView
                                project={activeProject}
                                rowClassName="shadow-lg scale-[1.01] ring-primary/30"
                                showActions={false}
                              />
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </DragOverlay>,
                    document.body,
                  )}
              </DndContext>
            </div>
          </>
        )}
      </Reveal>

    </div>
  );
}
