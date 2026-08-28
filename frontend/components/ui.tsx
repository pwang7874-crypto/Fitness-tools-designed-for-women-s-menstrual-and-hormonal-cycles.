"use client";

import Link from "next/link";
import StatusIcon from "@/components/StatusIcon";

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
    <section className={`surface-card rounded-[var(--radius-card)] bg-cream-2 p-5 md:p-8 ${tint} ${className}`}>
      {children}
    </section>
  );
}

export function PillButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = variant === "primary"
    ? "bg-ink text-cream hover:bg-ink-soft"
    : variant === "danger"
      ? "bg-danger text-white hover:opacity-90"
      : variant === "soft"
        ? "bg-sage text-ink hover:bg-sage-border"
        : "border border-frost bg-cream text-ink hover:bg-keylime";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pill-button interactive min-h-11 rounded-[var(--radius-btn)] px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      <span className="button-label">{children}</span>
    </button>
  );
}

export function LinkButton({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`pill-button interactive inline-flex min-h-11 items-center justify-center rounded-[var(--radius-btn)] bg-ink px-5 py-2.5 text-sm font-medium text-cream hover:bg-ink-soft ${className}`}>
      <span className="button-label">{children}</span>
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field-control block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {hint && <span className="-mt-1 mb-2 block text-xs leading-relaxed text-moss">{hint}</span>}
      {children}
    </label>
  );
}

export function inputCls() {
  return "w-full min-h-12 rounded-[var(--radius-lg)] border border-frost bg-cream/90 px-4 py-3 text-sm text-charcoal outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-moss/65 hover:border-sage-border focus:border-clay focus:bg-cream focus:shadow-[0_0_0_3px_rgba(167,83,56,.12)]";
}

export function ChipGroup({
  options,
  value,
  onChange,
  single = false,
}: {
  options: { value: string; label: string; icon?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  single?: boolean;
}) {
  const toggle = (next: string) => {
    if (single) onChange([next]);
    else onChange(value.includes(next) ? value.filter((item) => item !== next) : [...value, next]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            aria-pressed={selected}
            className={`choice-chip interactive min-h-11 rounded-full border px-3.5 py-2 text-sm ${selected
              ? "border-ink bg-ink font-medium text-cream"
              : "border-frost bg-cream text-charcoal hover:bg-keylime"}`}
          >
            {option.icon && <StatusIcon name={option.icon} selected={selected} />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

export function HeroTitle({
  eyebrow,
  lines,
}: {
  eyebrow?: string;
  lines: { text: string; accent?: boolean }[];
  light?: boolean;
}) {
  return (
    <div>
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h1 className="font-display max-w-3xl text-[42px] leading-[1.02] text-ink sm:text-[56px] lg:text-[64px]">
        {lines.map((line, index) => (
          <span key={`${line.text}-${index}`} className={line.accent ? "italic" : ""}>
            {line.text}{index < lines.length - 1 ? " " : null}
          </span>
        ))}
      </h1>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  accent,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="page-shell grid gap-3 py-3 md:grid-cols-[1.35fr_.65fr] md:gap-3 md:py-6">
      <section className="hero-main surface-panel animate-panel flex min-h-[245px] flex-col justify-between bg-keylime md:min-h-[320px]">
        <HeroTitle eyebrow={eyebrow} lines={[{ text: title }, { text: accent, accent: true }]} />
        <p className="mt-8 max-w-xl text-sm leading-6 text-charcoal/80 md:text-base">{description}</p>
      </section>
      <section className="hero-aside surface-panel animate-panel flex min-h-[150px] items-center justify-center bg-slate [animation-delay:80ms] md:min-h-[320px]">
        {aside || <LeafIcon className="h-28 w-28 text-ink md:h-36 md:w-36" />}
      </section>
    </div>
  );
}

export function Tag({
  children,
  tone = "keylime",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    keylime: "bg-keylime text-ink",
    sage: "bg-sage text-ink",
    rose: "bg-rose-soft text-charcoal",
    ink: "bg-ink text-cream",
    cream: "bg-cream text-ink",
    slate: "bg-slate text-ink",
  };
  return (
    <span className={`tag-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${tones[tone] || tones.keylime}`}>
      {children}
    </span>
  );
}

export function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" className={`brand-mark ${className}`} aria-hidden>
      <path d="M46 9C26 29 22 54 32 72c5 9 15 14 25 10 21-7 30-31 17-48C66 24 56 15 46 9Z" stroke="currentColor" strokeWidth="2" />
      <path d="M46 9c-1 25 8 46 27 62M29 81c12-12 23-18 36-20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="25" r="5" fill="#fffefc" fillOpacity=".72" />
    </svg>
  );
}

export function LoadingState({ label = "正在准备" }: { label?: string }) {
  return (
    <div className="page-shell flex min-h-[45vh] flex-col items-center justify-center gap-4" aria-live="polite">
      <div className="flex gap-2" aria-hidden>
        <span className="loading-dot h-2.5 w-2.5 rounded-full bg-ink" />
        <span className="loading-dot h-2.5 w-2.5 rounded-full bg-ink" />
        <span className="loading-dot h-2.5 w-2.5 rounded-full bg-ink" />
      </div>
      <p className="text-sm text-moss">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-shell py-20 text-center">
      <LeafIcon className="mx-auto h-20 w-20 text-ink" />
      <h1 className="font-display mt-5 text-4xl text-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-moss">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h2 className="font-display text-3xl leading-tight text-ink md:text-4xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-moss">{description}</p>}
    </div>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="relative h-32 w-32" aria-label={`${label} ${clamped}`}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#fffefc" strokeWidth="9" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke="#0f3e17" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="progress-ring-value transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-ink">
        <span className="font-display text-3xl">{clamped}</span>
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`interactive relative h-7 w-12 rounded-full shadow-[inset_0_0_0_1px_rgba(15,62,23,.08)] ${checked ? "bg-ink" : "bg-slate"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-cream shadow-[0_2px_8px_rgba(15,62,23,.15)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.22,.9,.32,1)] ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
