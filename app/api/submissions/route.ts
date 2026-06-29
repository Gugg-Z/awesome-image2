import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { createPromptSubmission, listSubmissions } from "@/lib/prompt-service";
import { parseTags, promptSubmissionSchema } from "@/lib/prompt-validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null;
  const submissions = await listSubmissions(status ?? undefined);

  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const raw = contentType.includes("multipart/form-data")
    ? await payloadFromFormData(await request.formData())
    : await request.json();

  const parsed = promptSubmissionSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission", issues: parsed.error.flatten() }, { status: 400 });
  }

  const submission = await createPromptSubmission({
    ...parsed.data,
    userId: auth.context.userId
  });

  return NextResponse.json({ submission }, { status: 201 });
}

async function payloadFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    positivePrompt: String(formData.get("positivePrompt") ?? ""),
    negativePrompt: String(formData.get("negativePrompt") ?? ""),
    category: String(formData.get("category") ?? ""),
    tags: parseTags(formData.get("tags")),
    model: String(formData.get("model") ?? ""),
    ratio: String(formData.get("ratio") ?? "")
  };
}
