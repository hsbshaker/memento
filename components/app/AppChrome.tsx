"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AuthenticatedAppShell } from "@/components/app/AuthenticatedAppShell";
import { isAuthenticatedAppRoute } from "@/components/app/app-nav";

type AppChromeProps = {
  children: ReactNode;
};

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();

  if (isAuthenticatedAppRoute(pathname)) {
    return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main>{children}</main>
    </div>
  );
}
