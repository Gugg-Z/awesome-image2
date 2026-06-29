"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, RotateCcw, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { getImageDisplayMeta } from "@/lib/image-display";
import { prompts } from "@/lib/mock-data";
import type { PromptItem } from "@/lib/mock-data";
import { fetchPrompt, fetchPrompts } from "@/lib/prompt-client";

type GenerationResult = {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED";
  costCredits: number;
  creatorShareCredits: number;
  balanceAfter: number;
  resultImageUrl?: string;
  provider: string;
  providerModel: string;
  errorMessage?: string;
};

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<PromptItem | null | undefined>(() => prompts.find((item) => item.id === params.id));
  const [relatedPrompts, setRelatedPrompts] = useState(prompts);
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "done" | "refunded">("idle");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPrompt(params.id)
      .then((data) => {
        if (!cancelled) setPrompt(data.prompt);
      })
      .catch(() => {
        if (!cancelled) setPrompt(prompts.find((item) => item.id === params.id) ?? null);
      });

    fetchPrompts({ limit: 8 })
      .then((data) => {
        if (!cancelled) setRelatedPrompts(data.prompts);
      })
      .catch(() => {
        if (!cancelled) setRelatedPrompts(prompts);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const resultImage = useMemo(() => {
    if (!prompt) return "";
    const index = relatedPrompts.findIndex((item) => item.id === prompt.id);
    return relatedPrompts[(index + 1 + relatedPrompts.length) % relatedPrompts.length]?.image ?? prompt.image;
  }, [prompt, relatedPrompts]);

  if (prompt === null) {
    notFound();
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-mist">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="rounded-xl border border-line bg-white p-6 text-sm text-slate-500">正在加载 Prompt...</div>
        </main>
      </div>
    );
  }

  const display = getImageDisplayMeta(prompt);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("Prompt 已复制，可直接用于 AI 生图");
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
      const response = await fetch(`/api/prompts/${encodeURIComponent(params.id)}/generate`, {
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

  const generatedImage = generationResult?.resultImageUrl ?? resultImage;

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="relative flex max-h-[780px] min-h-[360px] w-full items-center justify-center overflow-auto bg-slate-100 p-3">
              <Image
                src={prompt.image}
                alt={prompt.title}
                width={1200}
                height={1600}
                priority
                className="h-auto max-h-[740px] w-auto max-w-full rounded-lg object-contain"
              />
              {display.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  {display.badge}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[prompt.image, resultImage, relatedPrompts[2]?.image, relatedPrompts[4]?.image].filter(Boolean).map((image) => (
              <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-white">
                <Image src={image} alt="示例缩略图" fill className="object-cover" />
              </div>
            ))}
          </div>

          {(generationState === "done" || generationState === "refunded") && (
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
                {generationState === "done" ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
                {generationState === "done" ? "生成结果" : "生成失败，积分已退回"}
              </div>

              {generationState === "done" && (
                <div className="flex max-h-[640px] min-h-[280px] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-3">
                  {generatedImage.startsWith("http") ? (
                    <img src={generatedImage} alt="生成结果" className="h-auto max-h-[600px] w-auto max-w-full rounded-lg object-contain" />
                  ) : (
                    <Image
                      src={generatedImage}
                      alt="生成结果"
                      width={1200}
                      height={1200}
                      className="h-auto max-h-[600px] w-auto max-w-full rounded-lg object-contain"
                    />
                  )}
                </div>
              )}

              {generationResult && (
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <span>模型：{generationResult.providerModel}</span>
                  <span>扣除：{generationResult.costCredits} 积分</span>
                  <span>作者分成：{generationResult.creatorShareCredits} 积分</span>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-line bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="mb-4 flex flex-wrap gap-2">
            {prompt.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-semibold leading-tight text-ink">{prompt.title}</h1>
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
              <div className="max-h-96 overflow-auto rounded-lg border border-line bg-mist p-3 text-sm leading-6 text-slate-700 scrollbar-clean">
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

          <Link href="/" className="mt-4 block text-center text-sm text-slate-500 hover:text-brand-700">
            返回 Prompt 市集
          </Link>
        </aside>
      </main>
    </div>
  );
}
