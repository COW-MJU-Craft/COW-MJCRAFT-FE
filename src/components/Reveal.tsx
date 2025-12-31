import { useEffect, useRef, useState, type PropsWithChildren } from 'react';

type RevealProps = PropsWithChildren<{
  className?: string;
  delayMs?: number;
}>;

export default function Reveal({
  children,
  className = '',
  delayMs = 0,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShown(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={[
        'transition-all duration-700 ease-out will-change-transform',
        shown
          ? 'translate-y-0 opacity-100 blur-0'
          : 'translate-y-3 opacity-0 blur-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
