"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "今日", icon: "M4 12h3l2-5 3 10 2-5h6" },
  { href: "/diary", label: "记录", icon: "M6 4h12v16H6zM9 8h6M9 12h6" },
  { href: "/cycle", label: "周期", icon: "M12 3a9 9 0 1 0 9 9M12 7v5l3 2" },
  { href: "/library", label: "动作", icon: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" },
  { href: "/insights", label: "洞察", icon: "M5 19V9M12 19V5M19 19v-7" },
  { href: "/profile", label: "我的", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0" },
];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden>
      <path d="M15.5 3.5C9.7 10 8.5 18 11.2 23.4c1.3 2.7 4 4.3 6.7 3.8 5.8-1 9.6-7 7.9-12.4C24 9.4 19.7 5.5 15.5 3.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15.5 3.5c-.4 7.4 2.2 13.4 7.4 17.8M10.8 25.5c3.7-4 6.8-5.7 10-6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-3 z-30 hidden py-1 md:block">
        <div className="nav-capsule page-shell flex h-[64px] items-center justify-between px-4 lg:px-5">
          <Link href="/" className="brand-link flex items-center gap-2 text-ink" aria-label="顺期健身app首页">
            <span className="brand-mark"><Mark /></span>
            <span className="font-display text-[25px] leading-none">顺期健身app</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="主导航">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link interactive rounded-full px-4 py-2 text-sm ${active
                    ? "nav-link-active bg-keylime font-semibold text-ink"
                    : "text-charcoal hover:bg-cream-2"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav
        className="nav-capsule fixed inset-x-2 bottom-2 z-40 grid grid-cols-6 p-1.5 md:hidden"
        aria-label="移动端主导航"
      >
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link interactive flex min-w-0 flex-col items-center gap-1 rounded-[16px] px-1 py-2 text-[10px] ${active
                ? "nav-link-active bg-keylime font-semibold text-ink"
                : "text-moss"}`}
              aria-current={active ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={link.icon} />
              </svg>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
