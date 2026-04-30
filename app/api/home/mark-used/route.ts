import { NextResponse } from "next/server";
import { BenefitUsageMutationError } from "@/lib/benefits/benefit-usage-mutation";
import { markBenefitUsed } from "@/lib/home/mark-benefit-used";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MarkUsedRequestBody = {
  userBenefitId?: string;
  isUsedThisPeriod?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as MarkUsedRequestBody;
  const userBenefitId = body.userBenefitId?.trim();
  const isUsedThisPeriod = body.isUsedThisPeriod ?? true;

  if (!userBenefitId) {
    return NextResponse.json({ error: "Missing user benefit id." }, { status: 400 });
  }

  try {
    const result = await markBenefitUsed(user.id, userBenefitId, isUsedThisPeriod);

    if (!result) {
      return NextResponse.json({ error: "Benefit not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BenefitUsageMutationError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error: error.message,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to mark benefit used.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
