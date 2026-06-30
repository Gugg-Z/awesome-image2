"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Download, ImageIcon, Loader2, RotateCcw, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { getImageDisplayMeta } from "@/lib/image-display";
import { prompts } from "@/lib/mock-data";
import type { PromptItem } from "@/lib/mock-data";
import { fetchPrompt, fetchPrompts } from "@/lib/prompt-client";

type GenerationResult = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  costCredits: number;
  creatorShareCredits: number;
  balanceAfter: number;
  resultImageUrl?: string;
  provider: string;
  providerModel: string;
  errorMessage?: string;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<PromptItem | null | undefined>(() => prompts.find((item) => item.id === params.id));
  const [relatedPrompts, setRelatedPrompts] = useState(prompts);
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "done" | "refunded">("idle");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const pollingRef = useRef(0);

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
      pollingRef.current += 1;
    };
  }, [params.id]);

  useEffect(() => {
    pollingRef.current += 1;
    setGenerationState("idle");
    setGenerationResult(null);
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
  const generatedImage = generationResult?.resultImageUrl;

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

    const pollToken = pollingRef.current + 1;
    pollingRef.current = pollToken;
    setGenerationState("loading");
    setGenerationResult(null);

    try {
      const response = await fetch(`/api/prompts/${encodeURIComponent(params.id)}/generate`, {
        method: "POST"
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || data.error === "UNAUTHORIZED") {
          toast.error("请先登录后再生成图片");
          setGenerationState("idle");
          return;
        }

        if (data.error === "INSUFFICIENT_CREDITS") {
          toast.error(`积分不足：当前 ${data.balance}，需要 ${data.required}`);
          setGenerationState("idle");
          return;
        }

        throw new Error(data.error ?? "生成失败");
      }

      setGenerationResult(data.generation);
      dispatchCredits(data.generation.balanceAfter);

      if (data.generation.status === "PROCESSING" || data.generation.status === "PENDING") {
        toast.info(`生成任务已提交，成功后扣除 ${prompt.cost} 积分`);
        await pollGeneration(data.generation.id, pollToken);
        return;
      }

      applyTerminalGeneration(data.generation);
    } catch (error) {
      if (pollingRef.current !== pollToken) return;
      setGenerationState("idle");
      toast.error(error instanceof Error ? error.message : "生成失败，请稍后重试");
    }
  };

  const pollGeneration = async (generationId: string, pollToken: number) => {
    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await wait(3000);
      if (pollingRef.current !== pollToken) return;

      const response = await fetch(`/api/generations/${encodeURIComponent(generationId)}`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "生成状态查询失败");
      }

      setGenerationResult(data.generation);
      dispatchCredits(data.generation.balanceAfter);

      if (data.generation.status === "SUCCEEDED" || data.generation.status === "REFUNDED" || data.generation.status === "FAILED") {
        applyTerminalGeneration(data.generation);
        return;
      }
    }

    toast.info("生成仍在进行中，可以稍后在账户生成记录里查看结果");
  };

  const applyTerminalGeneration = (generation: GenerationResult) => {
    if (generation.status === "SUCCEEDED" && generation.resultImageUrl) {
      setGenerationState("done");
      toast.success(`同款图片生成完成，余额 ${generation.balanceAfter} 积分`);
      return;
    }

    setGenerationState("refunded");
    toast.error("生成失败，未扣除积分");
  };

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">参考图</p>
                {display.badge && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">{display.badge}</span>}
              </div>
              <div className="relative flex max-h-[720px] min-h-[360px] w-full items-center justify-center overflow-auto bg-slate-100 p-3">
                <Image
                  src={prompt.image}
                  alt={prompt.title}
                  width={1200}
                  height={1600}
                  priority
                  className="h-auto max-h-[680px] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                  {generationState === "idle" && <ImageIcon size={18} />}
                  {generationState === "loading" && <Loader2 size={18} className="animate-spin" />}
                  {generationState === "done" && <CheckCircle2 size={18} />}
                  {generationState === "refunded" && <RotateCcw size={18} />}
                  {generationState === "idle" && "生成结果"}
                  {generationState === "loading" && "正在生成同款"}
                  {generationState === "done" && "生成结果"}
                  {generationState === "refunded" && "生成失败，未扣费"}
                </div>
                <span className="text-xs text-slate-500">与参考图左右对比</span>
              </div>

              {generationState === "idle" && (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-mist px-4 py-8 text-center">
                  <ImageIcon size={28} className="text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-ink">点击右侧“生成同款”后，图片会在这里出现。</p>
                  <p className="mt-1 text-xs text-slate-500">生成后可直接和左侧参考图对比。</p>
                </div>
              )}

              {generationState === "loading" && (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg bg-slate-100 px-4 py-10 text-center">
                  <Loader2 size={30} className="animate-spin text-brand-600" />
                  <p className="mt-3 text-sm font-medium text-ink">生成任务已提交</p>
                  <p className="mt-1 text-xs text-slate-500">正在等待上游返回结果，完成后会自动展示。</p>
                </div>
              )}

              {generationState === "done" && generatedImage && (
                <>
                  <div className="flex max-h-[720px] min-h-[360px] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-3">
                    {generatedImage.startsWith("http") ? (
                      <img src={generatedImage} alt="生成结果" className="h-auto max-h-[680px] w-auto max-w-full rounded-lg object-contain" />
                    ) : (
                      <Image
                        src={generatedImage}
                        alt="生成结果"
                        width={1200}
                        height={1200}
                        className="h-auto max-h-[680px] w-auto max-w-full rounded-lg object-contain"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={generate}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-mist"
                    >
                      <WandSparkles size={15} />
                      再次生成
                    </button>
                    <a
                      href={generatedImage}
                      download
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-mist"
                    >
                      <Download size={15} />
                      下载结果
                    </a>
                  </div>
                </>
              )}

              {generationState === "refunded" && (
                <div className="rounded-lg border border-dashed border-line bg-mist p-4 text-sm leading-6 text-slate-600">
                  本次生成没有成功，未扣除积分。你可以稍后再次尝试，或先复制 Prompt 到其他工具里使用。
                  {generationResult?.errorMessage && <p className="mt-2 text-xs text-slate-500">失败原因：{generationResult.errorMessage}</p>}
                </div>
              )}

              {generationResult && (
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <span>模型：{generationResult.providerModel}</span>
                  <span>消耗：{generationResult.costCredits} 积分</span>
                  <span>作者分成：{generationResult.creatorShareCredits} 积分</span>
                  <span>余额：{generationResult.balanceAfter} 积分</span>
                </div>
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
            复制 Prompt 免费。生成同款成功后扣除 {prompt.cost} 积分；生成失败不扣费。
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

function dispatchCredits(credits: unknown) {
  if (typeof credits === "number") {
    window.dispatchEvent(new CustomEvent("promptbay:credits-changed", { detail: { credits } }));
  }
}
