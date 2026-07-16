"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { EDITABLE_PROPOSAL_FIELDS } from "@/lib/freshness/validate-proposal-edit";

/**
 * Review actions for one proposal. Approve supports edit-before-approve via a
 * constrained per-field form (server-validated again in the API and the RPC).
 */
export function ProposalActions({
  proposalId,
  status,
  afterValue,
}: {
  proposalId: string;
  status: string;
  afterValue: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const patch = (action: "approve" | "reject" | "reopen", editedAfterValue?: Record<string, unknown>) => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || undefined,
          edited_after_value: editedAfterValue,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string[];
      };
      if (!response.ok) {
        setMessage([payload.error, ...(payload.details ?? [])].filter(Boolean).join("; "));
        return;
      }
      setMessage(`${action} ok`);
      setEditing(false);
      router.refresh();
    });
  };

  const approveWithEdits = () => {
    const editedAfterValue: Record<string, unknown> = {};
    for (const [field, raw] of Object.entries(edits)) {
      const value = raw.trim();
      if (value.length === 0) continue;
      if (value === "null") {
        editedAfterValue[field] = null;
      } else if (field === "enrollment_required" || field === "requires_setup") {
        editedAfterValue[field] = value === "true";
      } else {
        editedAfterValue[field] = value;
      }
    }
    patch("approve", Object.keys(editedAfterValue).length > 0 ? editedAfterValue : undefined);
  };

  const inputClass =
    "rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 ring-focus";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Review actions</h2>
      <label className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        Review note (stored on the proposal and in the audit trail)
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status === "needs_review" ? (
          <>
            <button
              type="button"
              onClick={() => patch("approve")}
              disabled={isPending}
              className="rounded-md border border-accent-border bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              disabled={isPending}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-hover focus:outline-none focus-visible:ring-2 ring-focus"
            >
              {editing ? "Cancel edit" : "Edit before approve"}
            </button>
          </>
        ) : null}
        {status === "needs_review" || status === "approved" ? (
          <button
            type="button"
            onClick={() => patch("reject")}
            disabled={isPending}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive-muted focus:outline-none focus-visible:ring-2 ring-focus"
          >
            Reject
          </button>
        ) : null}
        {status === "rejected" ? (
          <button
            type="button"
            onClick={() => patch("reopen")}
            disabled={isPending}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-hover focus:outline-none focus-visible:ring-2 ring-focus"
          >
            Reopen
          </button>
        ) : null}
        {status === "approved" ? (
          <AdminActionButton
            label="Publish"
            endpoint={`/api/admin/proposals/${proposalId}/publish`}
            variant="primary"
            confirmText="Publish this change to the live catalog?"
          />
        ) : null}
        {status === "published" ? (
          <AdminActionButton
            label="Roll back"
            endpoint={`/api/admin/proposals/${proposalId}/rollback`}
            variant="destructive"
            confirmText="Restore the exact pre-publish state of this benefit?"
          />
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 rounded-md border border-border-muted bg-surface-muted p-3">
          <p className="text-xs text-subtle-foreground">
            Only the fields below are editable (type <code>null</code> to clear one). Leave blank to
            keep the extracted value. Lifecycle fields are derived at publish.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {EDITABLE_PROPOSAL_FIELDS.map((field) => (
              <label key={field} className="flex flex-col gap-1 text-xs text-muted-foreground">
                {field}
                <input
                  value={edits[field] ?? ""}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder={
                    afterValue && afterValue[field] !== undefined && afterValue[field] !== null
                      ? String(afterValue[field])
                      : ""
                  }
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={approveWithEdits}
            disabled={isPending}
            className="mt-3 rounded-md border border-accent-border bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 ring-focus disabled:opacity-50"
          >
            Approve with edits
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-subtle-foreground">{message}</p> : null}
    </div>
  );
}
