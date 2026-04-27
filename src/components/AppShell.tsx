import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  user,
  actions,
  children,
}: {
  user?: { name?: string | null; email?: string | null } | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const initials = (user?.name ?? user?.email ?? "D D")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative min-h-screen">
      <header className="relative z-10 border-b border-[--color-rule] bg-[--color-paper]/80 backdrop-blur-sm">
        <div className="container-shell flex items-center justify-between py-5">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-[--color-ink] text-[--color-paper]">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[--color-rust]" />
            </span>
            <div className="leading-tight">
              <span className="font-display text-[22px] font-medium italic tracking-tight text-[--color-ink]">
                Arthik
              </span>
              <span className="ml-1.5 text-xs tracking-wide text-[--color-muted]">
                clinic
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <div className="text-right leading-tight">
              <div className="eyebrow">Today</div>
              <div className="font-display text-sm text-[--color-ink]">{dateLabel}</div>
            </div>
            <div className="h-10 w-px bg-[--color-rule]" />
            <Link
              href="/settings/profile"
              title="Clinic & credentials"
              className="group flex items-center gap-3 rounded-full px-1 py-1 transition hover:bg-[--color-card]/60 focus:bg-[--color-card]/60 focus:outline-none"
            >
              <div className="hidden text-right leading-tight md:block">
                <div className="eyebrow">Attending</div>
                <div className="font-display text-sm text-[--color-ink] group-hover:text-[--color-pine]">
                  {user?.name ?? "Dev Doctor"}
                </div>
              </div>
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[--color-rule] bg-[--color-card] font-mono text-xs font-semibold text-[--color-pine] transition group-hover:border-[--color-pine]">
                {initials || "DD"}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[--color-paper] text-[--color-muted] opacity-0 transition group-hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5">
                    <path
                      d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </Link>
            {actions ? <div className="ml-1 flex items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </header>

      <main className="container-shell relative z-10 py-10 md:py-14">{children}</main>

      <footer className="container-shell relative z-10 mt-16 border-t border-[--color-rule] py-8 text-xs text-[--color-muted]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Arthik Clinic &middot; record of care &middot;{" "}
            <span className="font-mono">v0.1</span>
          </span>
          <span className="font-mono uppercase tracking-wider">
            Informational, not authoritative
          </span>
        </div>
      </footer>
    </div>
  );
}
