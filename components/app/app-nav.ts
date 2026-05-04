import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ListChecks, Settings, Wallet } from "lucide-react";

export type AppNavId = "overview" | "wallet" | "benefits" | "settings";

export type AppNavItem = {
  id: AppNavId;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: "overview", label: "Dashboard", href: "/home", icon: LayoutDashboard },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: Wallet },
  { id: "benefits", label: "Benefits", href: "/benefits", icon: ListChecks },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const AUTHENTICATED_APP_PREFIXES = ["/home", "/wallet", "/benefits", "/settings"];

export function isAuthenticatedAppRoute(pathname: string): boolean {
  return AUTHENTICATED_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getActiveAppNav(pathname: string): AppNavId | null {
  if (pathname === "/home" || pathname.startsWith("/home/")) return "overview";
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return "wallet";
  if (pathname === "/benefits" || pathname.startsWith("/benefits/")) return "benefits";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  return null;
}
