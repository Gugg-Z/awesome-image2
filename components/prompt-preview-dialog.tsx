"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Download, Edit3, ImageIcon, Loader2, RotateCcw, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { getImageDisplayMeta } from "@/lib/image-display";
import type { PromptItem } from "@/lib/mock-data";

type GenerationResult = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  costCredits: number;
  creatorShareCredits: number;
  balanceAfter: number;
  resultImageUrl?: string;
  providerModel: string;
  errorMessage?: string;
};

const generationSizes = [
  { label: "1K 4:3 横屏 1024x768", value: "1024x768" },
  { label: "1K 1:1 方形 1024x1024", value: "1024x1024" },
  { label: "2K 16:9 横屏 2048x1152", value: "2048x1152" },
  { label: "2K 9:16 竖屏 1152x2048", value: "1152x2048" },
  { label: "2K 1:1 方形 2048x2048", value: "2048x2048" },
  { label: "4K 16:9 横屏 3840x2160", value: "3840x2160" },
  { label: "4K 9:16 竖屏 2160x3840", value: "2160x3840" },
  { label: "4K 1:1 方形 2880x2880", value: "2880x2880" }
];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const generationStoragePrefix = "promptbay:generation:";

export function PromptPreviewDialog({
  prompt,
  onClose
}: {
  prompt: PromptItem | null;
  onClose: () => void;
}) {
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [selectedSize, setSelectedSize] = useState(generationSizes[1].value);
  const pollingRef = useRef(0);

  useEffect(() => {
    if (!prompt) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      pollingRef.current += 1;
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, prompt]);

  useEffect(() => {
    pollingRef.current += 1;
    setGenerationState("idle");
    setGenerationResult(null);
    setEditablePrompt(prompt?.prompt ?? "");

    if (!prompt?.id) return;

    const savedId = window.localStorage.getItem(generationStorageKey(prompt.id));
    if (!savedId) return;

    const pollToken = pollingRef.current + 1;
    pollingRef.current = pollToken;
    void restoreGeneration(savedId, pollToken);
  }, [prompt?.id]);

  if (!prompt) return null;

  const display = getImageDisplayMeta(prompt);
  const generatedImage = generationResult?.resultImageUrl;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(editablePrompt || prompt.prompt);
      toast.success("Prompt 已复制");
    } catch {
      toast.success("已模拟复制 Prompt");
    }
  };

  const generate = async () => {
    if (generationState === "loading") return;

    const promptText = editablePrompt.trim();
    if (!promptText) {
      toast.error("Prompt 不能为空");
      return;
    }

    const pollToken = pollingRef.current + 1;
    pollingRef.current = pollToken;
    setGenerationState("loading");
    setGenerationResult(null);

    try {
      const response = await fetch(`/api/prompts/${encodeURIComponent(prompt.id)}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: promptText,
          size: selectedSize
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setGenerationState("idle");

        if (response.status === 401 || data.error === "UNAUTHORIZED") {
          toast.error("请先登录后再生成图片");
          return;
        }

        if (data.error === "INSUFFICIENT_CREDITS") {
          toast.error(`积分不足：当前 ${data.balance}，需要 ${data.required}`);
          return;
        }

        throw new Error(data.error ?? "生成失败");
      }

      setGenerationResult(data.generation);
      dispatchCredits(data.generation.balanceAfter);
      window.localStorage.setItem(generationStorageKey(prompt.id), data.generation.id);

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

      const generation = await fetchGeneration(generationId);
      setGenerationResult(generation);
      dispatchCredits(generation.balanceAfter);

      if (generation.status === "SUCCEEDED" || generation.status === "REFUNDED" || generation.status === "FAILED") {
        applyTerminalGeneration(generation);
        return;
      }
    }

    toast.info("生成仍在进行中，可以稍后在账户生成记录里查看结果");
  };

  const restoreGeneration = async (generationId: string, pollToken: number) => {
    try {
      const generation = await fetchGeneration(generationId);
      setGenerationResult(generation);
      dispatchCredits(generation.balanceAfter);

      if (generation.status === "PROCESSING" || generation.status === "PENDING") {
        setGenerationState("loading");
        await pollGeneration(generationId, pollToken);
        return;
      }

      applyTerminalGeneration(generation, { silent: true });
    } catch {
      if (prompt?.id) window.localStorage.removeItem(generationStorageKey(prompt.id));
      if (pollingRef.current === pollToken) setGenerationState("idle");
    }
  };

  const applyTerminalGeneration = (generation: GenerationResult, options: { silent?: boolean } = {}) => {
    if (generation.status === "SUCCEEDED" && generation.resultImageUrl) {
      setGenerationState("done");
      window.localStorage.setItem(generationStorageKey(prompt.id), generation.id);
      if (!options.silent) toast.success(`同款图片生成完成，余额 ${generation.balanceAfter} 积分`);
      return;
    }

    setGenerationState("failed");
    window.localStorage.removeItem(generationStorageKey(prompt.id));
    if (!options.silent) toast.error("生成失败，未扣除积分");
  };

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
          <section className="bg-mist p-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-sm font-semibold text-ink">参考图</p>
                  {display.badge && <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">{display.badge}</span>}
                </div>
                <div className="relative flex min-h-[320px] items-center justify-center overflow-auto bg-slate-100 p-3 lg:min-h-[560px]">
                  <Image
                    src={prompt.image}
                    alt={prompt.title}
                    width={1200}
                    height={1600}
                    className="h-auto max-h-[620px] w-auto max-w-full rounded-lg object-contain"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-brand-100 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                    {generationState === "idle" && <ImageIcon size={18} />}
                    {generationState === "loading" && <Loader2 size={18} className="animate-spin" />}
                    {generationState === "done" && <CheckCircle2 size={18} />}
                    {generationState === "failed" && <RotateCcw size={18} />}
                    {generationState === "idle" && "生成结果"}
                    {generationState === "loading" && "正在生成同款"}
                    {generationState === "done" && "生成结果"}
                    {generationState === "failed" && "生成失败，未扣费"}
                  </div>
                  <span className="text-xs text-slate-500">与参考图左右对比</span>
                </div>

                {generationState === "idle" && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-mist px-4 py-8 text-center lg:min-h-[560px]">
                    <ImageIcon size={26} className="text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-ink">点击“生成同款”后，结果会在这里出现。</p>
                    <p className="mt-1 text-xs text-slate-500">关闭预览后再次打开，也会继续显示当前任务进度。</p>
                  </div>
                )}

                {generationState === "loading" && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg bg-slate-100 px-4 py-10 text-center lg:min-h-[560px]">
                    <Loader2 size={30} className="animate-spin text-brand-600" />
                    <p className="mt-3 text-sm font-medium text-ink">生成任务进行中</p>
                    <p className="mt-1 text-xs text-slate-500">关闭弹窗不会丢失进度，重新打开会自动恢复。</p>
                  </div>
                )}

                {generationState === "done" && generatedImage && (
                  <>
                    <div className="flex min-h-[320px] items-center justify-center overflow-auto rounded-lg bg-slate-100 p-3 lg:max-h-[620px] lg:min-h-[560px]">
                      {generatedImage.startsWith("http") ? (
                        <img src={generatedImage} alt="生成结果" className="h-auto max-h-[620px] w-auto max-w-full rounded-lg object-contain" />
                      ) : (
                        <Image
                          src={generatedImage}
                          alt="生成结果"
                          width={1200}
                          height={1200}
                          className="h-auto max-h-[620px] w-auto max-w-full rounded-lg object-contain"
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

                {generationState === "failed" && (
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
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden border-t border-line p-5 lg:border-l lg:border-t-0">
            <div className="mb-3 flex shrink-0 flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="shrink-0 text-xl font-semibold leading-tight text-ink">{prompt.title}</h3>
            <p className="mt-1 shrink-0 text-xs text-slate-500">
              作者 {prompt.author} · 已被生成 {prompt.uses.toLocaleString()} 次 · {prompt.likes} 收藏
            </p>

            <div className="mt-4 grid shrink-0 grid-cols-3 gap-2">
              {[
                ["模型", prompt.model],
                ["比例", prompt.ratio],
                ["消耗", `${prompt.cost} 积分`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-mist p-2.5">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="mb-2 text-sm font-semibold text-ink">正向 Prompt</p>
                <textarea
                  value={editablePrompt}
                  onChange={(event) => setEditablePrompt(event.target.value)}
                  className="min-h-[118px] flex-1 resize-none rounded-lg border border-line bg-mist p-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white scrollbar-clean"
                />
              </div>
              <div className="shrink-0">
                <p className="mb-2 text-sm font-semibold text-ink">负向 Prompt</p>
                <div className="max-h-20 overflow-auto rounded-lg border border-line bg-mist p-3 text-sm leading-6 text-slate-700 scrollbar-clean">
                  {prompt.negativePrompt || "暂无"}
                </div>
              </div>
            </div>

            <div className="mt-4 shrink-0 rounded-lg bg-brand-50 p-3 text-sm leading-6 text-brand-700">
              复制 Prompt 免费。生成同款成功后扣除 {prompt.cost} 积分；生成失败不扣费。生成图片会保存到你的生成记录中，也可以下载到本地。
            </div>

            <label className="mt-3 block shrink-0">
              <span className="mb-2 block text-sm font-semibold text-ink">生成尺寸</span>
              <select
                value={selectedSize}
                onChange={(event) => setSelectedSize(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500"
              >
                {generationSizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid shrink-0 grid-cols-2 gap-3">
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
              className="mt-3 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-slate-700 transition hover:bg-mist"
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

async function fetchGeneration(generationId: string): Promise<GenerationResult> {
  const response = await fetch(`/api/generations/${encodeURIComponent(generationId)}`, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "生成状态查询失败");
  }

  return data.generation;
}

function dispatchCredits(credits: unknown) {
  if (typeof credits === "number") {
    window.dispatchEvent(new CustomEvent("promptbay:credits-changed", { detail: { credits } }));
  }
}

function generationStorageKey(promptId: string) {
  return `${generationStoragePrefix}${promptId}`;
}
