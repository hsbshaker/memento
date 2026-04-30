import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Global reminder style has been removed." }, { status: 410 });
}
