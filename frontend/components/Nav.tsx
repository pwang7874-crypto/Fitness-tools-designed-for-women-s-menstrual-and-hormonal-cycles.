"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "今日" },
  { href: "/library", label: "动作库" },
  { href: "/insights", label: "洞察" },
  { href: "/profile", label: "我的" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-sage-border/30 bg-ink text-cream">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-meadow" aria-hidden />
          <span className="font-display text-lg font-bold tracking-tight">
            CycleFit <span className="text-meadow">AI</span>
          </span>
        </Link>
        <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                  active ? "bg-meadow font-medium text-ink" : "text-cream/75 hover:bg-ink-soft"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
