"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
};

const themeOptions: ThemeOption[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function getDefaultThemePreference(): ThemePreference {
  return "system";
}

export function ThemeSection() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    getStoredThemePreference,
    getDefaultThemePreference,
  );

  const handleSelect = (nextPreference: ThemePreference) => {
    setThemePreference(nextPreference);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Appearance</p>
      <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose how Memento looks on this device.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Theme preference">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm",
                  selected
                    ? "border-accent-border bg-accent-muted font-semibold text-foreground"
                    : "border-border bg-surface-muted text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{option.label}</span>
                <Check
                  className={cn("h-3.5 w-3.5 shrink-0 transition-opacity", selected ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        <p className="text-xs text-subtle-foreground">System follows your device setting.</p>
      </div>
    </div>
  );
}
