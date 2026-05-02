import { NextResponse } from "next/server";
import {
  USER_BENEFIT_TRACKING_STATUSES,
  type UserBenefitTrackingStatus,
} from "@/lib/constants/memento-schema";
import { setBenefitTrackingStatus } from "@/lib/home/set-benefit-tracking-status";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TrackingStatusRequestBody = {
  userBenefitId?: string;
  trackingStatus?: string;
};

function isTrackingStatus(value: string): value is UserBenefitTrackingStatus {
  return USER_BENEFIT_TRACKING_STATUSES.includes(value as UserBenefitTrackingStatus);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as TrackingStatusRequestBody;
  const userBenefitId = body.userBenefitId?.trim();
  const trackingStatus = body.trackingStatus?.trim();

  if (!userBenefitId || !trackingStatus || !isTrackingStatus(trackingStatus)) {
    return NextResponse.json({ error: "Missing or invalid tracking status." }, { status: 400 });
  }

  try {
    const result = await setBenefitTrackingStatus(user.id, userBenefitId, trackingStatus);

    if (!result) {
      return NextResponse.json({ error: "Benefit not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tracking status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
