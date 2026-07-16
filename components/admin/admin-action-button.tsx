"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Small action button for admin mutations: calls the given endpoint, surfaces
 * the JSON result inline, and refreshes server-rendered data on success.
 */
export function AdminActionButton({
  label,
  endpoint,
  method = "POST",
  body,
  confirmText,
  variant = "default",
}: {
  label: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  confirmText?: string;
  variant?: "default" | "primary" | "destructive";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onClick = () => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(endpoint, {
          method,
          headers: body ? { "content-type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          setMessage(String(payload.error ?? `failed (${response.status})`));
        } else if (typeof payload.status === "string") {
          setMessage(
            payload.reason ? `${payload.status}: ${String(payload.reason)}` : String(payload.status),
          );
        } else {
          setMessage("done");
        }
        router.refresh();
      } catch {
        setMessage("request failed");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={cn(
          "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50",
          variant === "primary" &&
            "bg-accent text-accent-foreground border-accent-border hover:opacity-90",
          variant === "destructive" &&
            "text-destructive border-border-strong hover:bg-destructive-muted",
          variant === "default" && "bg-surface text-foreground border-border hover:bg-hover",
        )}
      >
        {isPending ? "…" : label}
      </button>
      {message ? <span className="text-xs text-subtle-foreground">{message}</span> : null}
    </span>
  );
}
