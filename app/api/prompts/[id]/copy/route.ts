import { NextResponse } from "next/server";
import { recordPromptCopy } from "@/lib/prompt-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = await recordPromptCopy(id);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prompt });
}
