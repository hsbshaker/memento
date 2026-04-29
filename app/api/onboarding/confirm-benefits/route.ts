import { NextResponse } from "next/server";
import { saveConfirmBenefits, type SaveConfirmBenefitsInput } from "@/lib/onboarding/save-confirm-benefits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SaveConfirmBenefitsInput;

  try {
    await saveConfirmBenefits(user.id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save reminders.";

    if (message === "No cards were submitted." || message.includes("submitted") || message.includes("required")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to save reminders." }, { status: 500 });
  }
}
