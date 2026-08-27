"use client";
import { useState } from "react";

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
    <div
      className={`rounded-[var(--radius-card)] border border-frost bg-cream-2 p-5 ${tint} ${className}`}
    >
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

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
    if (single) {
      onChange([v]);
    } else {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    }
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
