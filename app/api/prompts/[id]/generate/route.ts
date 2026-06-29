import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { generateImageFromPrompt, InsufficientCreditsError } from "@/lib/generation-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const generation = await generateImageFromPrompt({
      promptId: id,
      userId: auth.context.userId
    });

    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          balance: error.balance,
          required: error.required
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
