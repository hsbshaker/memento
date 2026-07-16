import { NextResponse } from "next/server";

import { requireAdminForRoute } from "@/lib/auth/require-admin";
import { createSupabaseArtifactStore } from "@/lib/freshness/artifacts";
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/admin/artifacts/[snapshotId] — redirects to a short-lived signed
 * URL for the snapshot's immutable raw artifact. The bucket is private; this
 * server-generated signature (after admin authorization) is the ONLY access
 * path. Public artifact URLs never exist.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  const admin = await requireAdminForRoute();
  if (!admin.ok) return admin.response;
  const { snapshotId } = await params;

  const supabase = getServiceRoleSupabaseClient();
  const { data: snapshot, error } = await supabase
    .from("source_snapshots")
    .select("id, artifact_path")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!snapshot?.artifact_path) {
    return NextResponse.json({ error: "no artifact for this snapshot" }, { status: 404 });
  }

  try {
    const artifactStore = createSupabaseArtifactStore(supabase);
    const url = await artifactStore.createSignedUrl(
      snapshot.artifact_path as string,
      SIGNED_URL_TTL_SECONDS,
    );
    return NextResponse.redirect(url, 307);
  } catch (caught) {
    console.error("[freshness] failed to sign artifact url", {
      snapshotId,
      error: caught instanceof Error ? caught.message : String(caught),
    });
    return NextResponse.json({ error: "failed to sign artifact url" }, { status: 500 });
  }
}
