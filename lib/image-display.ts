import type { PromptItem } from "@/lib/mock-data";

export type DisplayMode = "cover" | "contain" | "long" | "grid" | "poster";

export type ImageDisplayMeta = {
  mode: DisplayMode;
  aspectRatio: number;
  isComplex: boolean;
  badge?: string;
};

const fallbackAspectRatios: Record<string, number> = {
  "case-500": 0.78,
  "case-501": 0.56,
  "case-502": 0.68,
  "case-503": 0.56,
  "case-504": 1,
  "case-505": 0.75,
  "case-506": 0.56,
  "case-507": 0.78,
  "case-508": 0.78
};

export function getImageDisplayMeta(prompt: PromptItem): ImageDisplayMeta {
  const aspectRatio = prompt.aspectRatio ?? fallbackAspectRatios[prompt.id] ?? ratioFromPrompt(prompt.ratio) ?? 0.78;
  const title = prompt.title.toLowerCase();
  const tags = prompt.tags.join(" ").toLowerCase();
  const mode = prompt.displayMode ?? inferDisplayMode({ title, tags, aspectRatio });

  return {
    mode,
    aspectRatio,
    isComplex: mode !== "cover",
    badge: badgeFor(mode)
  };
}

export function homepageImageClass(prompt: PromptItem) {
  const meta = getImageDisplayMeta(prompt);
  if (meta.mode === "cover" || meta.mode === "poster") return "object-cover";
  return "object-contain p-2";
}

export function exploreImageClass(prompt: PromptItem) {
  const meta = getImageDisplayMeta(prompt);
  if (meta.mode === "cover" || meta.mode === "poster") return "object-cover";
  return "object-contain p-2";
}

export function constrainedAspectRatio(prompt: PromptItem) {
  const meta = getImageDisplayMeta(prompt);
  return Math.max(0.58, Math.min(meta.aspectRatio, 1.45));
}

function inferDisplayMode(input: { title: string; tags: string; aspectRatio: number }): DisplayMode {
  if (input.title.includes("合集") || input.title.includes("卡牌") || input.tags.includes("other use cases")) {
    return "grid";
  }

  if (input.aspectRatio < 0.62) return "long";
  if (input.aspectRatio > 1.55) return "contain";
  if (input.tags.includes("poster") || input.title.includes("海报")) return "poster";

  return "cover";
}

function badgeFor(mode: DisplayMode) {
  if (mode === "long") return "长图";
  if (mode === "grid") return "合集";
  if (mode === "poster") return "海报";
  if (mode === "contain") return "完整预览";
  return undefined;
}

function ratioFromPrompt(ratio: string) {
  if (ratio === "9:16") return 9 / 16;
  if (ratio === "3:4") return 3 / 4;
  if (ratio === "4:5") return 4 / 5;
  if (ratio === "16:9") return 16 / 9;
  if (ratio === "1:1") return 1;
  return undefined;
}
