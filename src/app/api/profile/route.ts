import { NextResponse } from "next/server";
import { readJson, toErrorResponse } from "@/server/api";
import { requireApiUser } from "@/server/guards";
import { getBusinessProfile, saveBusinessProfile } from "@/services/business-profile";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireApiUser();
    const profile = await getBusinessProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiUser();
    const profile = await saveBusinessProfile(user.id, await readJson(request));
    return NextResponse.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
