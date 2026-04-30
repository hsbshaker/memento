"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_NAV_ITEMS, getActiveAppNav } from "@/components/app/app-nav";
import { cn } from "@/lib/cn";

type AuthenticatedAppShellProps = {
  children: ReactNode;
};

type NavigationProps = {
  activeItem: ReturnType<typeof getActiveAppNav>;
  onNavigate?: () => void;
};

function AppSidebarNavigation({ activeItem, onNavigate }: NavigationProps) {
  return (
    <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
      {APP_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeItem;

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D11]",
              isActive
                ? "bg-[#7FB6FF]/10 font-medium text-[#7FB6FF] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                : "text-white/55 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps) {
  const pathname = usePathname();
  const activeItem = useMemo(() => getActiveAppNav(pathname), [pathname]);
  const activeLabel = useMemo(
    () => APP_NAV_ITEMS.find((item) => item.id === activeItem)?.label ?? "Memento",
    [activeItem],
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="border-b border-white/10 bg-[#101418]/40 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="authenticated-mobile-nav"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/88 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70"
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="min-w-0 truncate text-sm font-semibold tracking-tight text-white">{activeLabel}</p>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-200 md:hidden",
          mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          className="absolute inset-0 bg-black/55"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className="absolute inset-y-0 left-0 w-full max-w-64 border-r border-white/10 bg-[#101418]/92 backdrop-blur-xl">
          <div className="flex items-center justify-between p-6">
            <Link
              href="/home"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70"
            >
              <span className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#7FB6FF] to-[#F7C948]/80" />
              <span className="text-xl font-bold tracking-tight text-white">Memento</span>
            </Link>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <AppSidebarNavigation activeItem={activeItem} onNavigate={() => setMobileMenuOpen(false)} />
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-white/10 bg-[#101418]/30 backdrop-blur-xl md:flex">
        <div className="p-6">
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-md text-xl font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70"
          >
            <span className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#7FB6FF] to-[#F7C948]/80" />
            <span>Memento</span>
          </Link>
        </div>

        <AppSidebarNavigation activeItem={activeItem} />
      </aside>

      <div className="min-w-0 w-full md:ml-64 md:w-[calc(100%-16rem)]">{children}</div>
    </div>
  );
}
