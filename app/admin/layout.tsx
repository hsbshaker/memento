import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { checkAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

/**
 * Admin shell. The single authorization gate for every /admin page:
 * unauthenticated → login; authenticated non-admin (or an empty ADMIN_EMAILS
 * allowlist) → 404 so the surface is never advertised.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await checkAdmin();
  if (!admin.ok) {
    if (admin.reason === "unauthenticated") redirect("/login");
    notFound();
  }

  const navItems = [
    { href: "/admin", label: "Health" },
    { href: "/admin/sources", label: "Sources" },
    { href: "/admin/proposals", label: "Proposals" },
    { href: "/admin/runs", label: "Runs" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">Memento Admin</span>
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <span className="text-xs text-subtle-foreground">{admin.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
