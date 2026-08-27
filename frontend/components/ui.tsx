"use client";

export function Card({
  children,
  className = "",
  tint = "",
}: {
  children: React.ReactNode;
  className?: string;
  tint?: string;
}) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-frost bg-white p-5 shadow-[var(--shadow-card)] ${tint} ${className}`}>
      {children}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-cream hover:bg-ink-soft shadow-[var(--shadow-chip)]"
      : variant === "danger"
        ? "bg-danger text-white hover:opacity-90"
        : variant === "soft"
          ? "bg-keylime text-ink hover:bg-sage"
          : "border border-sage-border bg-white text-ink hover:bg-keylime";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-6 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-moss">{label}</span>
      {children}
    </label>
  );
}

export function inputCls() {
  return "w-full rounded-[var(--radius-lg)] border border-frost bg-white px-3 py-2 text-sm outline-none transition focus:border-meadow";
}

export function ChipGroup({
  options,
  value,
  onChange,
  single = false,
}: {
  options: { value: string; label: string; emoji?: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  single?: boolean;
}) {
  const toggle = (v: string) => {
    if (single) onChange([v]);
    else onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              on
                ? "border-meadow bg-meadow font-medium text-ink"
                : "border-frost bg-white text-charcoal hover:border-sage"
            }`}
          >
            {o.emoji ? `${o.emoji} ` : ""}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

/* 衬线大标题 + 眉标 */
export function HeroTitle({
  eyebrow,
  lines,
  light = false,
}: {
  eyebrow?: string;
  lines: { text: string; accent?: boolean }[];
  light?: boolean;
}) {
  return (
    <div>
      {eyebrow && <div className={`eyebrow ${light ? "text-meadow" : "text-meadow"}`}>{eyebrow}</div>}
      <h1 className="font-display leading-[1.15]" style={{ fontSize: 34 }}>
        {lines.map((l, i) => (
          <span key={i} className={l.accent ? "text-meadow" : light ? "text-ink" : "text-ink"}>
            {l.text}
            {i < lines.length - 1 ? " " : null}
          </span>
        ))}
      </h1>
    </div>
  );
}

/* 小标签（药丸） */
export function Tag({ children, tone = "keylime" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    keylime: "bg-keylime text-ink",
    sage: "bg-sage text-ink",
    rose: "bg-rose-soft text-rose",
    ink: "bg-ink text-cream",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${tones[tone] || tones.keylime}`}>
      {children}
    </span>
  );
}

/* 植物线条装饰（替代 emoji 圆片） */
export function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path d="M32 8C20 20 16 34 20 46c1.5 4.5 5 7 8 8 8 2.5 18-2 22-10 4-9 1-24-18-36Z"
        stroke="#122315" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 8c-2 10 2 18 8 24" stroke="#55dd4a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 54c4-6 8-8 12-9" stroke="#e76f91" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
