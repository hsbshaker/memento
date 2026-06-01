"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  getStoredThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from "@/lib/theme/theme-preference";

type ThemeOption = {
  value: ThemePreference;
  label: string;
  Icon: typeof Monitor;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light mode", Icon: Sun },
  { value: "system", label: "System mode", Icon: Monitor },
  { value: "dark", label: "Dark mode", Icon: Moon },
];

function getServerSnapshot(): ThemePreference {
  return "system";
}

type ThemeToggleProps = { className?: string };

export function ThemeToggle({ className }: ThemeToggleProps) {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    getStoredThemePreference,
    getServerSnapshot,
  );

  const activeIndex = Math.max(
    THEME_OPTIONS.findIndex((o) => o.value === preference),
    0,
  );

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className={cn(
        "relative grid grid-cols-3 rounded-lg border border-border bg-surface p-0.5",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 m-0.5 rounded-md bg-surface-raised transition-transform duration-300 ease-out"
        style={{
          width: "calc((100% - 4px) / 3)",
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {THEME_OPTIONS.map((option) => {
        const isActive = preference === option.value;
        const { Icon } = option;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isActive}
            onClick={() => setThemePreference(option.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
