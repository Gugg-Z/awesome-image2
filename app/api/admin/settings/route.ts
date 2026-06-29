import { NextResponse } from "next/server";
import { z } from "zod";
import { getSystemSettings, updateSystemSettings } from "@/lib/admin-service";
import { requireAdmin } from "@/lib/authz";

const settingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string()
    })
  )
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const settings = await getSystemSettings();

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = settingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await updateSystemSettings(parsed.data.settings);

  return NextResponse.json({ settings });
}
