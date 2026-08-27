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
    <div className={`rounded-[var(--radius-card)] border border-frost bg-cream-2 p-5 shadow-[var(--shadow-card)] ${tint} ${className}`}>
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
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-meadow text-ink hover:bg-meadow-deep"
      : variant === "danger"
        ? "bg-danger text-white hover:opacity-90"
        : "border border-ink/30 text-ink hover:bg-keylime";
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
  return "w-full rounded-[var(--radius-lg)] border border-frost bg-white px-3 py-2 text-sm outline-none focus:border-meadow";
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

/* Kikin：eyebrow 眉标 + 超大展示标题 */
export function HeroTitle({
  eyebrow,
  lines,
}: {
  eyebrow?: string;
  lines: { text: string; accent?: boolean }[];
}) {
  return (
    <div>
      {eyebrow && <div className="eyebrow text-meadow">{eyebrow}</div>}
      <h1 className="font-display font-bold leading-[0.9] tracking-tight text-cream" style={{ fontSize: 48 }}>
        {lines.map((l, i) => (
          <span key={i} className={l.accent ? "text-meadow" : ""}>
            {l.text}
            {i < lines.length - 1 ? <br /> : null}
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
    cream: "bg-cream text-ink",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${tones[tone] || tones.keylime}`}>
      {children}
    </span>
  );
}

/* Kikin：圆形装饰徽章（enamel-pin 感），带旋转 */
export function PatchBadge({ emoji, size = 72, rotate = -8 }: { emoji: string; size?: number; rotate?: number }) {
  return (
    <span
      className="patch-badge"
      style={{ width: size, height: size, fontSize: size * 0.5, transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
