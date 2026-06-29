import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/lib/admin-service";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const dashboard = await getAdminDashboard();

  return NextResponse.json(dashboard);
}
