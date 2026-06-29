import { NextResponse } from "next/server";
import { getPromptById } from "@/lib/prompt-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = await getPromptById(id);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  return NextResponse.json({ prompt });
}
