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
      <p className="text-xs font-medium tracking-[0.22em] text-white/42 uppercase">Email reminders</p>
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 space-y-3">
        <p className="text-xs text-white/50">
          Get a monthly email summary when you have card benefits worth using soon.
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Email reminders</p>
            <p className="mt-0.5 text-xs text-white/50">
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
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7C948] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed",
              enabled ? "bg-[#F7C948]" : "bg-white/20",
            ].join(" ")}
          >
            <span
              className={[
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                enabled ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
