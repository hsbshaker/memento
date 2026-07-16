"use client";

import { useState, useTransition } from "react";

/** Live allowlisted fetch preview — mutates nothing; renders the verdict. */
export function TestFetchButton({ sourceId }: { sourceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const run = () => {
    startTransition(async () => {
      setResult(null);
      try {
        const response = await fetch(`/api/admin/sources/${sourceId}/test-fetch`, { method: "POST" });
        setResult((await response.json()) as Record<string, unknown>);
      } catch {
        setResult({ error: "request failed" });
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-hover focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50"
      >
        {isPending ? "Fetching…" : "Test fetch (preview)"}
      </button>
      {result ? (
        <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-border-muted bg-surface-muted p-3 text-xs text-muted-foreground">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
