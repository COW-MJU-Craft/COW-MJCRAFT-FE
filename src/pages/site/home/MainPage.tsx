import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Reveal from "../../../components/ui/Reveal";
import { SkeletonProjectCard } from "../../../components/ui/Skeleton";
import { introApi } from "../../../api/intro";
import IntroduceMainView from "../../../features/introduce/IntroduceMainView";
import { projectsApi } from "../../../api/projects";
import { parseDateLike } from "../../../utils/date";
import ProjectCard from "../../../components/project/ProjectCard";

const CAROUSEL_PEEK = false;

export default function MainPage() {
  const [isScrollable, setIsScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: introMain, isLoading: introLoading } = useQuery({
    queryKey: ["introduceMain"],
    queryFn: () => introApi.getMain(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  const {
    data: projectsData,
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const orderedProjects = useMemo(() => {
    const toTimestamp = (value: unknown) => {
      const parsed = parseDateLike(value as string | number[] | null | undefined);
      return parsed?.getTime() ?? Number.NEGATIVE_INFINITY;
    };

    const toNumericId = (id: string) => {
      const parsed = Number(id);
      return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
    };

    return [...(projectsData ?? [])]
      .sort((a, b) => {
        const aTimestamp = toTimestamp(a.updatedAt ?? a.deadlineDate ?? a.endAt);
        const bTimestamp = toTimestamp(b.updatedAt ?? b.deadlineDate ?? b.endAt);
        if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
        return toNumericId(b.id) - toNumericId(a.id);
      })
      .slice(0, 9);
  }, [projectsData]);

  const scrollByCard = useCallback(
    (direction: 'left' | 'right') => {
      const el = scrollerRef.current;
      if (!el) return;

      const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
      if (cards.length === 0) return;

      const scrollLeft = el.scrollLeft;
      let activeIndex = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < cards.length; i += 1) {
        const distance = Math.abs(cards[i].offsetLeft - scrollLeft);
        if (distance < minDistance) {
          minDistance = distance;
          activeIndex = i;
        }
      }

      const targetIndex =
        direction === 'right'
          ? Math.min(activeIndex + 1, cards.length - 1)
          : Math.max(activeIndex - 1, 0);

      el.scrollTo({
        left: cards[targetIndex].offsetLeft,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [prefersReducedMotion],
  );

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const scrollLeft = el.scrollLeft;
    const scrollable = maxScrollLeft > 1;

    setIsScrollable(scrollable);
    setCanScrollLeft(scrollable && scrollLeft > 1);
    setCanScrollRight(scrollable && scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(el);

    return () => observer.disconnect();
  }, [updateScrollState, orderedProjects.length]);

  return (
    <div>
      <IntroduceMainView
        data={introMain ?? null}
        loading={introLoading}
        variant="public"
        linkToAbout
      />

      <section className="mx-auto max-w-7xl px-4 py-14">
        <Reveal>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl text-slate-900">프로젝트</h2>
              <p className="mt-2 text-sm text-slate-600">
                곧 공개되거나 진행 중인 프로젝트를 확인하세요.
              </p>
            </div>
            <Link
              to="/projects"
              className="text-sm font-bold text-primary hover:underline"
            >
              전체 보기 →
            </Link>
          </div>
        </Reveal>

        <div className="mt-8">
          {projectsLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonProjectCard key={idx} />
              ))}
            </div>
          ) : projectsError ? (
            <p className="text-sm text-rose-600">
              프로젝트를 불러오지 못했어요
            </p>
          ) : orderedProjects.length === 0 ? (
            <p className="text-sm text-slate-500">등록된 프로젝트가 없어요</p>
          ) : (
            <div className="group/carousel relative overflow-visible">
              <div
                ref={scrollerRef}
                className={`no-scrollbar flex flex-nowrap snap-x snap-mandatory gap-6 md:gap-8 pb-4 touch-pan-x ${
                  CAROUSEL_PEEK
                    ? 'overflow-x-auto pr-12 md:pr-16'
                    : 'overflow-x-auto md:overflow-x-hidden pr-0'
                }`}
                style={{ WebkitOverflowScrolling: 'touch' }}
                onScroll={updateScrollState}
              >
                {orderedProjects.map((project, index) => (
                  <div
                    key={project.id}
                    data-card
                    className="shrink-0 snap-start w-[290px] sm:w-[330px] md:w-[370px] lg:w-[calc((100%-4rem)/3)]"
                  >
                    <Reveal delayMs={index * 80}>
                      <ProjectCard
                        project={project}
                        showApplyAction={false}
                        size="main"
                      />
                    </Reveal>
                  </div>
                ))}
              </div>

              {isScrollable && (
                <>
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={() => scrollByCard('left')}
                      className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-sm transition-opacity duration-200 hover:bg-white md:inline-flex md:opacity-0 md:group-hover/carousel:opacity-100"
                      aria-label="이전 프로젝트"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollByCard('right')}
                      className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-sm transition-opacity duration-200 hover:bg-white md:inline-flex md:opacity-0 md:group-hover/carousel:opacity-100"
                      aria-label="다음 프로젝트"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
