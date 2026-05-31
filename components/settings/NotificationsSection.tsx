"use client";

import { useState } from "react";

type NotificationsSectionProps = {
  emailRemindersEnabled: boolean;
};

export function NotificationsSection({ emailRemindersEnabled: initialValue }: NotificationsSectionProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (saving) return;

    const next = !enabled;
    setSaving(true);
    setError(null);

    const response = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailRemindersEnabled: next }),
    });

    setSaving(false);

    if (!response.ok) {
      setError("Couldn't save your preference. Try again.");
      return;
    }

    setEnabled(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Email reminders</p>
      <div className="rounded-xl border border-border bg-surface px-4 py-3.5 space-y-3">
        <p className="text-xs text-muted-foreground">
          Get a monthly email summary when you have card benefits worth using soon.
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Email reminders</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {enabled
                ? "Memento may email you a monthly reminder digest when you have relevant benefits to use."
                : "You will not receive monthly reminder digest emails. You can still track benefits in the app."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Email reminders"
            disabled={saving}
            onClick={() => void handleToggle()}
            className={[
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
              enabled ? "bg-accent" : "bg-surface-muted",
            ].join(" ")}
          >
            <span
              className={[
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-foreground shadow ring-0 transition duration-200 ease-in-out",
                enabled ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
