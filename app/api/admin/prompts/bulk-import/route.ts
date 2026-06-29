import { NextResponse } from "next/server";
import { bulkImportPrompts } from "@/lib/prompt-service";
import { bulkImportSchema } from "@/lib/prompt-validation";
import { requireAdmin } from "@/lib/authz";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bulkImportSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const prompts = await bulkImportPrompts(parsed.data.prompts);

  return NextResponse.json({ prompts }, { status: 201 });
}
