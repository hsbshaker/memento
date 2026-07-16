"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { SourceParserConfig } from "@/lib/types/freshness-schema";

/** Edit a source's cadence, authority, parser strategy, and parser config. */
export function SourceConfigForm({
  sourceId,
  initial,
}: {
  sourceId: string;
  initial: {
    authority_level: string;
    parser_strategy: string;
    check_cadence_days: number;
    monthly_full_verification: boolean;
    parser_config: SourceParserConfig | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [authority, setAuthority] = useState(initial.authority_level);
  const [strategy, setStrategy] = useState(initial.parser_strategy);
  const [cadence, setCadence] = useState(String(initial.check_cadence_days));
  const [monthly, setMonthly] = useState(initial.monthly_full_verification);
  const [contentSelectors, setContentSelectors] = useState(
    (initial.parser_config?.content_selectors ?? []).join(", "),
  );
  const [ignoreSelectors, setIgnoreSelectors] = useState(
    (initial.parser_config?.ignore_selectors ?? []).join(", "),
  );
  const [markers, setMarkers] = useState((initial.parser_config?.expected_markers ?? []).join(", "));
  const [minLength, setMinLength] = useState(
    initial.parser_config?.min_expected_length ? String(initial.parser_config.min_expected_length) : "",
  );
  const [notes, setNotes] = useState(initial.notes ?? "");

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const save = () => {
    startTransition(async () => {
      setMessage(null);
      const parserConfig: SourceParserConfig = {};
      const content = parseList(contentSelectors);
      const ignore = parseList(ignoreSelectors);
      const expected = parseList(markers);
      if (content.length > 0) parserConfig.content_selectors = content;
      if (ignore.length > 0) parserConfig.ignore_selectors = ignore;
      if (expected.length > 0) parserConfig.expected_markers = expected;
      const minLengthNumber = Number(minLength);
      if (minLength.trim() && Number.isFinite(minLengthNumber) && minLengthNumber > 0) {
        parserConfig.min_expected_length = Math.floor(minLengthNumber);
      }

      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          authority_level: authority,
          parser_strategy: strategy,
          check_cadence_days: Number(cadence),
          monthly_full_verification: monthly,
          parser_config: Object.keys(parserConfig).length > 0 ? parserConfig : null,
          notes: notes.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(response.ok ? "saved" : (payload.error ?? `failed (${response.status})`));
      if (response.ok) router.refresh();
    });
  };

  const inputClass =
    "rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 ring-focus";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Parser & schedule configuration</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Authority level
          <select value={authority} onChange={(e) => setAuthority(e.target.value)} className={inputClass}>
            <option value="official">official</option>
            <option value="secondary">secondary</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Parser strategy
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={inputClass}>
            <option value="generic_html">generic_html</option>
            <option value="pdf_text">pdf_text</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Check cadence (days)
          <input value={cadence} onChange={(e) => setCadence(e.target.value)} inputMode="numeric" className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
          Monthly full verification
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
          Content selectors (comma-separated CSS)
          <input value={contentSelectors} onChange={(e) => setContentSelectors(e.target.value)} placeholder="main, .benefits-section" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
          Ignore selectors
          <input value={ignoreSelectors} onChange={(e) => setIgnoreSelectors(e.target.value)} placeholder=".promo-banner, .cookie-notice" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Expected markers
          <input value={markers} onChange={(e) => setMarkers(e.target.value)} placeholder="Platinum Card" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Min expected length
          <input value={minLength} onChange={(e) => setMinLength(e.target.value)} inputMode="numeric" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-md border border-accent-border bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50"
        >
          {isPending ? "…" : "Save configuration"}
        </button>
        {message ? <span className="text-xs text-subtle-foreground">{message}</span> : null}
      </div>
    </div>
  );
}
