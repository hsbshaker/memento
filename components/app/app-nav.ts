import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Settings, Wallet } from "lucide-react";

export type AppNavId = "overview" | "wallet" | "settings";

export type AppNavItem = {
  id: AppNavId;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: "overview", label: "Dashboard", href: "/home", icon: LayoutDashboard },
  { id: "wallet", label: "Wallet", href: "/wallet", icon: Wallet },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const AUTHENTICATED_APP_PREFIXES = ["/home", "/wallet", "/settings"];

export function isAuthenticatedAppRoute(pathname: string): boolean {
  return AUTHENTICATED_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getActiveAppNav(pathname: string): AppNavId | null {
  if (pathname === "/home" || pathname.startsWith("/home/")) return "overview";
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return "wallet";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  return null;
}
