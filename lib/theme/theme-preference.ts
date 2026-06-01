export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "memento-theme";
const THEME_CHANGE_EVENT = "memento-theme-change";
let fallbackThemePreference: ThemePreference = "system";

export function parseThemePreference(value: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return fallbackThemePreference;
  }
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }

  document.documentElement.dataset.theme = preference;
}

export function saveThemePreference(preference: ThemePreference) {
  fallbackThemePreference = preference;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme choice is device-only; applying it still works if persistence is unavailable.
  }
}

export function setThemePreference(preference: ThemePreference) {
  applyThemePreference(preference);
  saveThemePreference(preference);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  } catch {
    // The DOM theme has already been applied, so a missed local UI notification is non-blocking.
  }
}

export function subscribeToThemePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const syncPreference = () => {
    applyThemePreference(getStoredThemePreference());
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      syncPreference();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, syncPreference);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, syncPreference);
  };
}
