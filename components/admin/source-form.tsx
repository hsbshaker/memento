"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Register a new source (created disabled; enabling is a separate action). */
export function SourceForm({ cards }: { cards: Array<{ id: string; display_name: string | null }> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("html");
  const [authority, setAuthority] = useState("official");
  const [cadence, setCadence] = useState("7");

  const submit = () => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          card_id: cardId,
          source_url: url.trim(),
          source_type: sourceType,
          authority_level: authority,
          check_cadence_days: Number(cadence),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? `failed (${response.status})`);
        return;
      }
      setUrl("");
      router.refresh();
    });
  };

  const inputClass =
    "rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 ring-focus";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Register source</h2>
      <p className="mt-1 text-xs text-subtle-foreground">
        HTTPS on an allowlisted issuer host only. New sources start disabled.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Card
          <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={inputClass}>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.display_name ?? card.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-72 flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Source URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.americanexpress.com/us/credit-cards/card/…"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Type
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputClass}>
            <option value="html">html</option>
            <option value="pdf">pdf</option>
            <option value="manual_upload">manual_upload</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Authority
          <select value={authority} onChange={(e) => setAuthority(e.target.value)} className={inputClass}>
            <option value="official">official</option>
            <option value="secondary">secondary</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Cadence (days)
          <input
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            inputMode="numeric"
            className={`${inputClass} w-20`}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !url.trim() || !cardId}
          className="rounded-md border border-accent-border bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50"
        >
          {isPending ? "…" : "Register"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
