import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { validateProposalEdit } from "@/lib/freshness/validate-proposal-edit";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/proposals/[id]
 * body: { action: "approve" | "reject" | "reopen", note?, edited_after_value? }
 *
 * Reviewer identity ALWAYS comes from the authenticated session. Transitions
 * are compare-and-swap on the current status; every change is audited in
 * proposal_events. Evidence fields are immutable — only edited_after_value may
 * be written, and it is server-validated against the field contract.
 */

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  approve: { from: ["needs_review"], to: "approved" },
  reject: { from: ["needs_review", "approved"], to: "rejected" },
  reopen: { from: ["rejected"], to: "needs_review" },
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    note?: string;
    edited_after_value?: unknown;
  } | null;

  if (!body || typeof body.action !== "string" || !(body.action in TRANSITIONS)) {
    return NextResponse.json(
      { error: "action must be one of approve, reject, reopen" },
      { status: 400 },
    );
  }

  let editedAfterValue: Record<string, unknown> | null = null;
  if (body.edited_after_value !== undefined && body.edited_after_value !== null) {
    if (body.action !== "approve") {
      return NextResponse.json(
        { error: "edited_after_value is only accepted with approve" },
        { status: 400 },
      );
    }
    const validated = validateProposalEdit(body.edited_after_value);
    if (!validated.ok) {
      return NextResponse.json(
        { error: "invalid edited_after_value", details: validated.errors },
        { status: 400 },
      );
    }
    editedAfterValue = validated.value;
  }

  const transition = TRANSITIONS[body.action];
  const supabase = getServiceRoleSupabaseClient();

  const { data: proposal, error: loadError } = await supabase
    .from("benefit_change_proposals")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!proposal) return NextResponse.json({ error: "proposal not found" }, { status: 404 });

  if (!transition.from.includes(proposal.status as string)) {
    return NextResponse.json(
      { error: `cannot ${body.action} a proposal in status ${proposal.status}` },
      { status: 409 },
    );
  }

  const patch: Record<string, unknown> = {
    status: transition.to,
    reviewer_email: admin.email,
    reviewed_at: new Date().toISOString(),
  };
  if (typeof body.note === "string" && body.note.trim().length > 0) {
    patch.review_note = body.note.trim();
  }
  if (editedAfterValue) {
    patch.edited_after_value = editedAfterValue;
  }

  // CAS on the observed status; reopen can also hit the dedupe unique index
  // when a newer revision is already open.
  const { data: updated, error: updateError } = await supabase
    .from("benefit_change_proposals")
    .update(patch)
    .eq("id", id)
    .eq("status", proposal.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json(
        { error: "cannot reopen: a newer open proposal exists for the same change" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "proposal changed concurrently — reload" }, { status: 409 });
  }

  const events: Array<Record<string, unknown>> = [
    {
      proposal_id: id,
      event_type: "status_changed",
      actor: admin.email,
      from_status: proposal.status,
      to_status: transition.to,
      detail: body.note ? { note: body.note } : null,
    },
  ];
  if (editedAfterValue) {
    events.push({
      proposal_id: id,
      event_type: "edited",
      actor: admin.email,
      detail: { edited_after_value: editedAfterValue },
    });
  }
  const { error: eventError } = await supabase.from("proposal_events").insert(events);
  if (eventError) {
    console.error("[freshness] failed to write proposal events", {
      proposalId: id,
      error: eventError.message,
    });
  }

  return NextResponse.json({ proposal: updated });
}
