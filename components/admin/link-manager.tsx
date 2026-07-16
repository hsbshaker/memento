"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface LinkableBenefit {
  id: string;
  benefit_name: string | null;
  benefit_code: string | null;
  benefit_status: string | null;
  linked: boolean;
  is_primary: boolean;
  coverage_type: string | null;
}

/** Manage which benefits a source verifies (benefit_source_links). */
export function LinkManager({
  sourceId,
  benefits,
}: {
  sourceId: string;
  benefits: LinkableBenefit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const call = (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/links", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_id: sourceId, ...body }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) setMessage(payload.error ?? `failed (${response.status})`);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Benefit coverage (what this source verifies)</h2>
      <p className="mt-1 text-xs text-subtle-foreground">
        Only linked benefits can be verified or published from this source.
      </p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="py-1.5 pr-2 font-medium">Benefit</th>
            <th className="py-1.5 pr-2 font-medium">Status</th>
            <th className="py-1.5 pr-2 font-medium">Coverage</th>
            <th className="py-1.5 pr-2 font-medium">Primary</th>
            <th className="py-1.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {benefits.map((benefit) => (
            <tr key={benefit.id} className="border-b border-border-muted">
              <td className="py-1.5 pr-2 text-foreground">
                {benefit.benefit_name ?? benefit.benefit_code ?? benefit.id}
              </td>
              <td className="py-1.5 pr-2 text-muted-foreground">{benefit.benefit_status}</td>
              <td className="py-1.5 pr-2">
                {benefit.linked ? (
                  <select
                    value={benefit.coverage_type ?? "full"}
                    disabled={isPending}
                    onChange={(e) =>
                      call("PATCH", { benefit_id: benefit.id, coverage_type: e.target.value })
                    }
                    className="rounded-md border border-border-strong bg-surface px-1.5 py-1 text-xs text-foreground"
                  >
                    <option value="full">full</option>
                    <option value="partial">partial</option>
                    <option value="mention">mention</option>
                  </select>
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </td>
              <td className="py-1.5 pr-2">
                {benefit.linked ? (
                  <input
                    type="checkbox"
                    checked={benefit.is_primary}
                    disabled={isPending}
                    onChange={(e) =>
                      call("PATCH", { benefit_id: benefit.id, is_primary: e.target.checked })
                    }
                  />
                ) : (
                  <span className="text-subtle-foreground">—</span>
                )}
              </td>
              <td className="py-1.5">
                {benefit.linked ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => call("DELETE", { benefit_id: benefit.id })}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Unlink
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => call("POST", { benefit_id: benefit.id })}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Link
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? <p className="mt-2 text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
