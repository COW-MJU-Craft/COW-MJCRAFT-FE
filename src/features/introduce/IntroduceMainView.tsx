import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import Reveal from '../../components/ui/Reveal';
import type { IntroduceMainSummary } from '../../api/site/intro';

type Props = {
  data: IntroduceMainSummary | null;
  loading?: boolean;
  fallback?: {
    title?: string;
    subtitle?: string;
    summary?: string;
  };
  useReveal?: boolean;
  variant?: 'public' | 'preview';
  linkToAbout?: boolean;
};

type HeroLogo = {
  key?: string;
  imageUrl?: string;
};

type WrapperProps = {
  useReveal: boolean;
  className?: string;
  delayMs?: number;
  children: React.ReactNode;
};

function RevealOrPlain({
  useReveal,
  className,
  delayMs,
  children,
}: WrapperProps) {
  if (!useReveal) return <>{children}</>;
  return (
    <Reveal className={className} delayMs={delayMs}>
      {children}
    </Reveal>
  );
}

function LogoWrap({
  linkToAbout,
  children,
}: {
  linkToAbout: boolean;
  children: React.ReactNode;
}) {
  if (!linkToAbout) return <>{children}</>;
  return (
    <Link
      to="/about"
      aria-label="로고 상세로 이동"
      className="flex h-72 w-full items-center justify-center"
    >
      {children}
    </Link>
  );
}

function PreviewView({
  title,
  subtitle,
  summary,
  logos,
  loading,
  linkToAbout,
}: {
  title: string;
  subtitle: string;
  summary: string;
  logos: HeroLogo[];
  loading: boolean;
  linkToAbout: boolean;
}) {
  const safeLogos = logos.slice(0, 8);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="mt-4 grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ) : (
            <div className="min-w-0 space-y-3">
              {title ? (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    타이틀
                  </div>
                  <h1 className="mt-1 break-keep font-heading text-base leading-tight tracking-tight text-slate-900">
                    {title}
                  </h1>
                </div>
              ) : null}

              {subtitle ? (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    서브타이틀
                  </div>
                  <p className="mt-1 break-keep text-sm leading-relaxed text-slate-600">
                    {subtitle}
                  </p>
                </div>
              ) : null}

              {summary ? (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    요약
                  </div>
                  <div className="prose prose-slate mt-1 max-w-none text-sm text-slate-600">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                      {summary}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-slate-500">
              로고(최대 8개)
            </div>
            <div className="text-[11px] text-slate-400">{logos.length}개</div>
          </div>

          {safeLogos.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {safeLogos.map((logo, idx) => {
              const img = (
              <img
                src={logo.imageUrl ?? ''}
                alt={`logo-${idx}`}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-xl bg-white object-contain"
                draggable={false}
              />
              );

                return linkToAbout ? (
                  <Link
                    key={`${logo.key ?? 'logo'}-${idx}`}
                    to="/about"
                    aria-label="소개 페이지로 이동"
                    className="inline-flex"
                  >
                    {img}
                  </Link>
                ) : (
                  <span
                    key={`${logo.key ?? 'logo'}-${idx}`}
                    className="inline-flex"
                  >
                    {img}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-400">
              등록된 로고가 없어요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PublicView({
  title,
  subtitle,
  summary,
  logos,
  loading,
  useReveal,
  linkToAbout,
}: {
  title: string;
  subtitle: string;
  summary: string;
  logos: HeroLogo[];
  loading: boolean;
  useReveal: boolean;
  linkToAbout: boolean;
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const slides = useMemo(() => {
    if (logos.length === 0) return [];
    if (logos.length === 1) return logos;
    return [...logos, logos[0]];
  }, [logos]);

  useEffect(() => {
    if (logos.length <= 1) return;

    const id = window.setInterval(() => {
      setSlideIndex((prev) => prev + 1);
    }, 3200);

    return () => window.clearInterval(id);
  }, [logos.length]);

  useEffect(() => {
    if (logos.length <= 1) return;
    if (slideIndex !== logos.length) return;

    const handle = window.setTimeout(() => {
      setEnableTransition(false);
      setSlideIndex(0);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
    }, 920);

    return () => window.clearTimeout(handle);
  }, [slideIndex, logos.length]);

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-4 py-16 md:grid-cols-[1.1fr_0.9fr]">
        <RevealOrPlain useReveal={useReveal} className="min-w-0 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="flex gap-3 pt-2">
                <div className="h-10 w-36 rounded bg-slate-200" />
                <div className="h-10 w-28 rounded bg-slate-200" />
              </div>
            </div>
          ) : (
            <>
              {title ? (
                <h1 className="break-keep font-heading text-4xl leading-tight tracking-tight md:text-5xl">
                  {title}
                </h1>
              ) : null}

              {subtitle ? (
                <p className="break-keep text-base leading-relaxed text-slate-600">
                  {subtitle}
                </p>
              ) : null}

              {summary ? (
                <div className="prose prose-slate max-w-none text-sm text-slate-600">
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                    {summary}
                  </ReactMarkdown>
                </div>
              ) : null}
            </>
          )}
        </RevealOrPlain>

        <RevealOrPlain
          useReveal={useReveal}
          delayMs={120}
          className="md:justify-self-end"
        >
          {slides.length > 0 ? (
            <div className="w-full md:w-130">
              <div className="relative overflow-hidden">
                <div
                  ref={trackRef}
                  className="flex"
                  style={{
                    transform: `translateX(-${slideIndex * 100}%)`,
                    transition: enableTransition
                      ? 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)'
                      : 'none',
                  }}
                >
                  {slides.map((logo, idx) => (
                    <div
                      key={`${logo.key ?? 'logo'}-${idx}`}
                      className="w-full shrink-0"
                    >
                      <LogoWrap linkToAbout={linkToAbout}>
                        <img
                          src={logo.imageUrl ?? ''}
                          alt={`logo-${idx}`}
                          loading={idx === 0 ? undefined : 'lazy'}
                          decoding="async"
                          className="h-64 w-auto max-w-full select-none object-contain"
                          draggable={false}
                        />
                      </LogoWrap>
                    </div>
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-r from-white to-transparent" />
              </div>
            </div>
          ) : null}
        </RevealOrPlain>
      </div>
    </section>
  );
}

export default function IntroduceMainView({
  data,
  loading = false,
  fallback,
  useReveal = true,
  variant = 'public',
  linkToAbout = false,
}: Props) {
  const title = (data?.title ?? fallback?.title ?? '').trim();
  const subtitle = (data?.subtitle ?? fallback?.subtitle ?? '').trim();
  const summary = data?.summary ?? fallback?.summary ?? '';

  const logos = useMemo<HeroLogo[]>(() => {
    return (data?.heroLogos ?? []).filter(
      (l) => (l?.imageUrl ?? '').trim().length > 0,
    );
  }, [data]);

  const isPreview = variant === 'preview';

  const publicKey = useMemo(() => {
    const first = logos[0]?.imageUrl ?? '';
    return `${logos.length}-${first}`;
  }, [logos]);

  if (isPreview) {
    return (
      <PreviewView
        title={title}
        subtitle={subtitle}
        summary={summary}
        logos={logos}
        loading={loading}
        linkToAbout={linkToAbout}
      />
    );
  }

  return (
    <PublicView
      key={publicKey}
      title={title}
      subtitle={subtitle}
      summary={summary}
      logos={logos}
      loading={loading}
      useReveal={useReveal}
      linkToAbout={linkToAbout}
    />
  );
}
