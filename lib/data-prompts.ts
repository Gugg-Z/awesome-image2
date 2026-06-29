import { readFileSync } from "fs";
import path from "path";
import type { PromptItem } from "@/lib/mock-data";

type LocalCase = {
  id: number;
  title: string;
  image: string;
  imageAlt?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  prompt: string;
  promptPreview?: string;
  category: string;
  styles?: string[];
  scenes?: string[];
  featured?: boolean;
  githubUrl?: string;
};

type CasesFile = {
  cases: LocalCase[];
};

type StyleCategory = {
  value: string;
  title?: {
    zh?: string;
    en?: string;
  };
};

type StyleLibraryFile = {
  categories?: StyleCategory[];
};

let cachedPrompts: PromptItem[] | undefined;
let cachedCategories: string[] | undefined;

export function getLocalDataPrompts() {
  if (cachedPrompts) return cachedPrompts;

  try {
    const casesPath = path.join(process.cwd(), "data", "cases.json");
    const raw = JSON.parse(readFileSync(casesPath, "utf8")) as CasesFile;
    const categoryLabels = getCategoryLabelMap();
    const prioritizedCases = [
      ...raw.cases.filter((item) => item.id >= 500 && item.id <= 508).sort((a, b) => b.id - a.id),
      ...raw.cases.filter((item) => item.id < 500 || item.id > 508)
    ];

    cachedPrompts = prioritizedCases.map((item, index) => {
      const category = categoryLabels.get(item.category) ?? item.category;
      const tags = unique([
        category,
        ...(item.styles ?? []),
        ...(item.scenes ?? [])
      ]).slice(0, 4);

      return {
        id: `case-${item.id}`,
        title: item.title,
        category,
        tags,
        image: item.image,
        height: cardHeightFor(index),
        prompt: item.prompt,
        negativePrompt: "",
        model: "gpt-image-2",
        ratio: ratioFromPrompt(item.prompt),
        cost: 10,
        author: item.sourceLabel ?? "PromptBay",
        uses: item.featured ? 900 + index : Math.max(80, 520 - index),
        likes: item.featured ? 260 + (index % 70) : 40 + (index % 180),
        status: "published"
      };
    });

    return cachedPrompts;
  } catch {
    cachedPrompts = [];
    return cachedPrompts;
  }
}

export function getLocalDataCategories() {
  if (cachedCategories) return cachedCategories;

  const prompts = getLocalDataPrompts();
  cachedCategories = ["全部", ...unique(prompts.map((prompt) => prompt.category))];

  return cachedCategories;
}

function getCategoryLabelMap() {
  try {
    const stylePath = path.join(process.cwd(), "data", "style-library.json");
    const raw = JSON.parse(readFileSync(stylePath, "utf8")) as StyleLibraryFile;
    return new Map(
      (raw.categories ?? []).map((category) => [
        category.value,
        category.title?.zh ?? category.title?.en ?? category.value
      ])
    );
  } catch {
    return new Map<string, string>();
  }
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function ratioFromPrompt(prompt: string) {
  if (/9:16|vertical 9:16/i.test(prompt)) return "9:16";
  if (/3:4|vertical 3:4/i.test(prompt)) return "3:4";
  if (/4:5/i.test(prompt)) return "4:5";
  if (/1:1|square/i.test(prompt)) return "1:1";
  return "auto";
}

function cardHeightFor(index: number) {
  const heights = [520, 430, 480, 380, 560, 455, 600, 420, 500, 470];
  return heights[index % heights.length];
}
