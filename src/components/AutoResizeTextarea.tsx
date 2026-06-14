import { useEffect, useRef, type TextareaHTMLAttributes } from 'react';

export default function AutoResizeTextarea({
  className,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      onInput={resize}
      className={`resize-none overflow-hidden ${className ?? ''}`}
    />
  );
}
