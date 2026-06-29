import type { PromptItem } from "@/lib/mock-data";

export async function fetchPrompts(params: {
  query?: string;
  category?: string;
  tag?: string;
  sort?: "hot" | "latest";
  limit?: number;
} = {}) {
  const searchParams = new URLSearchParams();

  if (params.query) searchParams.set("q", params.query);
  if (params.category) searchParams.set("category", params.category);
  if (params.tag) searchParams.set("tag", params.tag);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetch(`/api/prompts?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch prompts");
  }

  return (await response.json()) as {
    prompts: PromptItem[];
    categories?: string[];
  };
}

export async function fetchPrompt(id: string) {
  const response = await fetch(`/api/prompts/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error("Failed to fetch prompt");
  }

  return (await response.json()) as {
    prompt: PromptItem;
  };
}
