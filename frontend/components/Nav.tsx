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
    <header className="sticky top-0 z-20 border-b border-frost bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="M12 3C8 8 7 13 8 17c.4 1.6 1.8 2.5 3 2.5 3 1 7-.7 8-4 1.5-3.5 0-9-7-12.5Z"
              stroke="#122315" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 3c-1 4 .5 7 3 9" stroke="#55dd4a" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-display text-lg font-bold text-ink">
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
                  active ? "bg-meadow font-medium text-ink" : "text-charcoal hover:bg-keylime"
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
