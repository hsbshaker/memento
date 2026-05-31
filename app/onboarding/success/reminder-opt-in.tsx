"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function ReminderOptIn() {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleOptIn = async () => {
    if (state !== "idle") return;
    setState("saving");
    setError(null);

    const response = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailRemindersEnabled: true }),
    });

    if (!response.ok) {
      setState("idle");
      setError("Couldn't save your preference. Try again.");
      return;
    }

    setState("done");
  };

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-success">Reminders on ✓</p>
        <p className="text-xs text-muted-foreground">You&apos;ll get a monthly email when you have benefits worth using.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-xs text-muted-foreground">
        Get a monthly email when you have card benefits worth using. You can turn this off anytime in Settings.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="subtle"
          size="md"
          onClick={() => void handleOptIn()}
          disabled={state === "saving"}
        >
          {state === "saving" ? "Saving…" : "Turn on reminders"}
        </Button>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip
        </Link>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
