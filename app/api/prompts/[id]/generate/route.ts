import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/authz";
import { createImageGenerationJob, InsufficientCreditsError, MissingUserError } from "@/lib/generation-service";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSignedInUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await _request.json().catch(() => ({}));
    const generation = await createImageGenerationJob({
      promptId: id,
      userId: auth.context.userId,
      promptText: typeof body.prompt === "string" ? body.prompt : undefined,
      size: typeof body.size === "string" ? body.size : undefined
    });

    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof MissingUserError) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

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
