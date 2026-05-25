import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { searchCards } from "@/lib/cards/search-cards";

function getSafeErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
      name?: string;
    };

    return {
      name: candidate.name ?? null,
      message: candidate.message ?? null,
      code: candidate.code ?? null,
      details: candidate.details ?? null,
      hint: candidate.hint ?? null,
    };
  }

  return {
    name: null,
    message: error instanceof Error ? error.message : String(error),
    code: null,
    details: null,
    hint: null,
  };
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") ?? "").trim();

  try {
    const results = await searchCards(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Card search failed", {
      query,
      error: getSafeErrorDetails(error),
    });
    const message = error instanceof Error ? error.message : "Failed to search cards.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
