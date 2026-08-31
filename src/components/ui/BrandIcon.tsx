type Brand = 'instagram' | 'kakao' | 'notion' | 'drive' | 'form' | 'link';

const BRAND_STYLES: Record<Brand, string> = {
  instagram: 'bg-[#E1306C] text-white',
  kakao: 'bg-[#FEE500] text-[#3C1E1E]',
  notion: 'bg-black text-white',
  drive: 'bg-[#0F9D58] text-white',
  form: 'bg-primary text-white',
  link: 'bg-slate-200 text-slate-700',
};

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17" cy="7" r="1.3" fill="currentColor" />
    </svg>
  );
}

function KakaoGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 5c-4.4 0-8 2.7-8 6.1 0 2.3 1.6 4.4 4.1 5.4l-.8 3.2 3.3-2.1c.5.1 1 .1 1.4.1 4.4 0 8-2.7 8-6.1S16.4 5 12 5z"
        fill="currentColor"
      />
    </svg>
  );
}

function TextGlyph({ label }: { label: string }) {
  return <span className="text-xs font-bold">{label}</span>;
}

export default function BrandIcon({ kind }: { kind: Brand }) {
  return (
    <span
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-full',
        BRAND_STYLES[kind],
      ].join(' ')}
      aria-hidden="true"
    >
      {kind === 'instagram' ? (
        <InstagramGlyph />
      ) : kind === 'kakao' ? (
        <KakaoGlyph />
      ) : kind === 'notion' ? (
        <TextGlyph label="N" />
      ) : kind === 'drive' ? (
        <TextGlyph label="GD" />
      ) : kind === 'form' ? (
        <TextGlyph label="폼" />
      ) : (
        <TextGlyph label="링크" />
      )}
    </span>
  );
}
