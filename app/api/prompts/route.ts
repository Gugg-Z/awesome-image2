import { NextResponse } from "next/server";
import { getLocalDataCategories } from "@/lib/data-prompts";
import { listPrompts } from "@/lib/prompt-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompts = await listPrompts({
    query: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    sort: searchParams.get("sort") === "latest" ? "latest" : "hot",
    limit: Number(searchParams.get("limit") ?? 50)
  });

  return NextResponse.json({ prompts, categories: getLocalDataCategories() });
}
