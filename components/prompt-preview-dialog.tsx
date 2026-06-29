"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Edit3, Loader2, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { getImageDisplayMeta } from "@/lib/image-display";
import type { PromptItem } from "@/lib/mock-data";

type GenerationResult = {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED";
  costCredits: number;
  creatorShareCredits: number;
  balanceAfter: number;
  resultImageUrl?: string;
  providerModel: string;
};

export function PromptPreviewDialog({
  prompt,
  onClose
}: {
  prompt: PromptItem | null;
  onClose: () => void;
}) {
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "done" | "refunded">("idle");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    if (!prompt) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, prompt]);

  useEffect(() => {
    setGenerationState("idle");
    setGenerationResult(null);
  }, [prompt?.id]);

  if (!prompt) return null;

  const display = getImageDisplayMeta(prompt);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("Prompt 已复制");
    } catch {
      toast.success("已模拟复制 Prompt");
    }
  };

  const generate = async () => {
    if (generationState === "loading") return;

    setGenerationState("loading");
    setGenerationResult(null);
    toast.info(`已扣除 ${prompt.cost} 积分，正在生成同款`);

    try {
      const response = await fetch(`/api/prompts/${encodeURIComponent(prompt.id)}/generate`, {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "INSUFFICIENT_CREDITS") {
          toast.error(`积分不足：当前 ${data.balance}，需要 ${data.required}`);
          setGenerationState("idle");
          return;
        }

        throw new Error(data.error ?? "生成失败");
      }

      setGenerationResult(data.generation);

      if (data.generation.status === "REFUNDED") {
        setGenerationState("refunded");
        toast.error("生成失败，积分已自动退回");
        return;
      }

      setGenerationState("done");
      toast.success(`同款图片生成完成，余额 ${data.generation.balanceAfter} 积分`);
    } catch (error) {
      setGenerationState("idle");
      toast.error(error instanceof Error ? error.message : "生成失败，请稍后重试");
    }
  };

  const generatedImage = generationResult?.resultImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-ink/55 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand-700">Prompt 预览</p>
            <h2 className="truncate text-base font-semibold text-ink sm:text-lg">{prompt.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-mist hover:text-ink"
            aria-label="关闭"
            title="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4 bg-mist p-4">
            <div className="relative flex min-h-[320px] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-3 lg:min-h-[560px]">
              <Image
                src={prompt.image}
                alt={prompt.title}
                width={1200}
                height={1600}
                className="h-auto max-h-[680px] w-auto max-w-full rounded-lg object-contain"
              />
              {display.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  {display.badge}
                </span>
              )}
            </div>

            {(generationState === "done" || generationState === "refunded") && (
              <div className="rounded-lg border border-brand-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
                  <CheckCircle2 size={18} />
                  {generationState === "done" ? "生成结果" : "生成失败，积分已退回"}
                </div>
                {generationState === "done" && generatedImage && (
                  <div className="flex max-h-[520px] min-h-[260px] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-3">
                    {generatedImage.startsWith("http") ? (
                      <img src={generatedImage} alt="生成结果" className="h-auto max-h-[480px] w-auto max-w-full rounded-lg object-contain" />
                    ) : (
                      <Image
                        src={generatedImage}
                        alt="生成结果"
                        width={1200}
                        height={1200}
                        className="h-auto max-h-[480px] w-auto max-w-full rounded-lg object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="min-h-0 overflow-auto border-t border-line p-5 lg:border-l lg:border-t-0">
            <div className="mb-4 flex flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="text-2xl font-semibold leading-tight text-ink">{prompt.title}</h3>
            <p className="mt-2 text-sm text-slate-500">
              作者 {prompt.author} · 已被生成 {prompt.uses.toLocaleString()} 次 · {prompt.likes} 收藏
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ["模型", prompt.model],
                ["比例", prompt.ratio],
                ["消耗", `${prompt.cost} 积分`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-mist p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">正向 Prompt</p>
                <div className="max-h-80 overflow-auto rounded-lg border border-line bg-mist p-3 text-sm leading-6 text-slate-700 scrollbar-clean">
                  {prompt.prompt}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">负向 Prompt</p>
                <div className="rounded-lg border border-line bg-mist p-3 text-sm leading-6 text-slate-700">{prompt.negativePrompt || "暂无"}</div>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-brand-50 p-3 text-sm leading-6 text-brand-700">
              复制 Prompt 免费。生成同款将扣除 {prompt.cost} 积分，成功后作者按比例获得返积分；生成失败会自动退款。
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-slate-700 transition hover:bg-mist"
              >
                <Copy size={17} />
                复制 Prompt
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={generationState === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generationState === "loading" ? <Loader2 size={17} className="animate-spin" /> : <WandSparkles size={17} />}
                {generationState === "loading" ? "生成中" : "生成同款"}
              </button>
            </div>

            <Link
              href={`/prompts/${prompt.id}`}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-slate-700 transition hover:bg-mist"
            >
              <Edit3 size={17} />
              编辑 / 工作台
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
