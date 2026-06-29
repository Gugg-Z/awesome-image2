import { NextResponse } from "next/server";
import { reviewSubmission } from "@/lib/prompt-service";
import { reviewSubmissionSchema } from "@/lib/prompt-validation";
import { requireAdmin } from "@/lib/authz";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = reviewSubmissionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const submission = await reviewSubmission({
    id,
    status: parsed.data.status,
    reviewerId: auth.context.userId,
    reviewNote: parsed.data.reviewNote
  });

  return NextResponse.json({ submission });
}
