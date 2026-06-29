"use client";

import Image from "next/image";
import Link from "next/link";
import { Copy, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { constrainedAspectRatio, exploreImageClass, getImageDisplayMeta } from "@/lib/image-display";
import type { PromptItem } from "@/lib/mock-data";

export function PromptCard({
  prompt,
  onOpen
}: {
  prompt: PromptItem;
  onOpen?: (prompt: PromptItem) => void;
}) {
  const display = getImageDisplayMeta(prompt);
  const aspectRatio = constrainedAspectRatio(prompt);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("Prompt 已复制");
    } catch {
      toast.success("已模拟复制 Prompt");
    }
  };

  const openPreview = () => {
    if (onOpen) onOpen(prompt);
  };

  return (
    <article className="masonry-item overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <button type="button" onClick={openPreview} className="block w-full text-left" aria-label={`查看 ${prompt.title}`}>
        <div className="relative w-full overflow-hidden bg-slate-100" style={{ aspectRatio, maxHeight: 520 }}>
          <Image
            src={prompt.image}
            alt={prompt.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={exploreImageClass(prompt)}
          />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-700 backdrop-blur">
            可生成同款
          </div>
          {display.badge && (
            <div className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {display.badge}
            </div>
          )}
          {display.isComplex && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100 to-transparent" />
          )}
        </div>
      </button>
      <div className="space-y-3 p-3">
        <button type="button" onClick={openPreview} className="block text-left text-sm font-semibold leading-5 text-ink hover:text-brand-700">
          {prompt.title}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-mist px-2 py-1 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-xs text-slate-500">{prompt.cost} 积分/次</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyPrompt}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
              aria-label="复制 Prompt"
              title="复制 Prompt"
            >
              <Copy size={16} />
            </button>
            <Link
              href={`/prompts/${prompt.id}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
              aria-label="编辑 / 工作台"
              title="编辑 / 工作台"
            >
              <WandSparkles size={16} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
