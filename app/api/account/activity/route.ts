import { NextResponse } from "next/server";
import { getAccountActivity } from "@/lib/account-service";
import { requireUser } from "@/lib/authz";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const activity = await getAccountActivity(auth.context.userId);

  return NextResponse.json(activity);
}
