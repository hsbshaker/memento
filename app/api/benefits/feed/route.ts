import { NextResponse } from "next/server";
import { buildBenefitsFeed } from "@/lib/benefits/build-benefits-feed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BenefitInventoryStatus, BenefitsInventoryItem } from "@/lib/types/server-data";

// ─── Filter helpers ───────────────────────────────────────────────────────────

function matchesSearch(item: BenefitsInventoryItem, query: string): boolean {
  if (!query) return true;
  const haystack = [item.benefitName, item.cardName, item.issuer, item.nickname, item.lastFour]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function matchesStatus(
  item: BenefitsInventoryItem,
  status: BenefitInventoryStatus | null,
): boolean {
  if (!status) return true;
  return item.inventoryStatus === status;
}

function matchesIssuer(item: BenefitsInventoryItem, issuer: string | null): boolean {
  if (!issuer) return true;
  return item.issuer === issuer;
}

function matchesCadence(item: BenefitsInventoryItem, cadence: string | null): boolean {
  if (!cadence) return true;
  return item.cadence === cadence;
}

function matchesCard(item: BenefitsInventoryItem, userCardId: string | null): boolean {
  if (!userCardId) return true;
  return item.userCardId === userCardId;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const statusParam = url.searchParams.get("status");
    const issuer = url.searchParams.get("issuer")?.trim() || null;
    const cadence = url.searchParams.get("cadence")?.trim() || null;
    const userCardId = url.searchParams.get("userCardId")?.trim() || null;

    const validStatuses: BenefitInventoryStatus[] = ["unused", "used", "not_tracked"];
    const status =
      statusParam && validStatuses.includes(statusParam as BenefitInventoryStatus)
        ? (statusParam as BenefitInventoryStatus)
        : null;

    const feed = await buildBenefitsFeed(user.id);

    const filteredItems = feed.items.filter(
      (item) =>
        matchesSearch(item, search) &&
        matchesStatus(item, status) &&
        matchesIssuer(item, issuer) &&
        matchesCadence(item, cadence) &&
        matchesCard(item, userCardId),
    );

    return NextResponse.json({
      items: filteredItems,
      counts: feed.counts,
      filters: feed.filters,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load benefits feed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
