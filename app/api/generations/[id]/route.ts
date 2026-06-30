import { NextResponse } from "next/server";
import { requireSignedInUser } from "@/lib/authz";
import { getImageGenerationForUser } from "@/lib/generation-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSignedInUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const generation = await getImageGenerationForUser({
    generationId: id,
    userId: auth.context.userId
  });

  if (!generation) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  return NextResponse.json({ generation });
}
