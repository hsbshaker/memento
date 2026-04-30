import type { LucideIcon } from "lucide-react";
import { House, List, Settings } from "lucide-react";

export type AppNavId = "overview" | "benefits" | "settings";

export type AppNavItem = {
  id: AppNavId;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: "overview", label: "Overview", href: "/home", icon: House },
  { id: "benefits", label: "Benefits", href: "/wallet", icon: List },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const AUTHENTICATED_APP_PREFIXES = ["/home", "/wallet", "/settings"];

export function isAuthenticatedAppRoute(pathname: string): boolean {
  return AUTHENTICATED_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getActiveAppNav(pathname: string): AppNavId | null {
  if (pathname === "/home" || pathname.startsWith("/home/")) return "overview";
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return "benefits";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  return null;
}
