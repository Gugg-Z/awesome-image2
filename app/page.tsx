"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, Search, SlidersHorizontal, TrendingUp, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { PromptPreviewDialog } from "@/components/prompt-preview-dialog";
import { SiteHeader } from "@/components/site-header";
import { getImageDisplayMeta, homepageImageClass } from "@/lib/image-display";
import { popularTags, prompts, type PromptItem } from "@/lib/mock-data";
import { fetchPrompts } from "@/lib/prompt-client";

export default function HomePage() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const featuredPrompts = useMemo(() => [...items].sort((a, b) => b.uses - a.uses).slice(0, 5), [items]);
  const latestPrompts = useMemo(() => items.slice(0, 5), [items]);

  useEffect(() => {
    let cancelled = false;

    fetchPrompts({ limit: 40 })
      .then((data) => {
        if (!cancelled) setItems(data.prompts);
      })
      .catch(() => {
        if (!cancelled) setItems(prompts);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrompts(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const copyPrompt = async (prompt: PromptItem) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      toast.success("Prompt 已复制");
    } catch {
      toast.success("已模拟复制 Prompt");
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main>
        <section className="border-b border-line bg-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:py-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
                <TrendingUp size={16} />
                发现、复制并一键生成同款 AI 图片
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">专业 AI 生图 Prompt 灵感库</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                浏览精选图片案例，复制可用 Prompt，或消耗积分直接生成同款。开发者与用户共同维护，投稿通过后获得积分奖励。
              </p>
              <div className="mt-6 flex max-w-2xl items-center rounded-xl border border-line bg-mist px-4 py-3">
                <Search size={19} className="text-slate-400" />
                <input
                  className="ml-3 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="搜索 prompt、风格、场景..."
                />
                <Link href="/explore" className="ml-3 shrink-0 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white">
                  搜索
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((item) => (
                  <Link
                    key={item}
                    href={`/explore?tag=${encodeURIComponent(item)}`}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-line bg-mist p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">今日概览</span>
                <SlidersHorizontal size={17} className="text-brand-600" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["8", "精选分类"],
                  ["12.8k", "生成次数"],
                  ["30", "投稿奖励"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg bg-white p-3">
                    <p className="text-lg font-semibold text-ink">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">
                热门：产品海报、人像写真、室内设计、国风电商图。复制免费，站内生成按配置扣积分。
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
          <HomePromptSection
            title="热门精选"
            description="优先展示使用量和收藏表现更好的 Prompt，帮助新用户快速找到高确定性的案例。"
            prompts={featuredPrompts}
            moreHref="/explore?sort=hot"
            copyPrompt={copyPrompt}
            openPrompt={setSelectedPrompt}
            loading={loadingPrompts}
          />
          <HomePromptSection
            title="最新上架"
            description="展示最近补充的 Prompt，让常回来的用户有新鲜感，也给新投稿更多曝光。"
            prompts={latestPrompts}
            moreHref="/explore?sort=latest"
            copyPrompt={copyPrompt}
            openPrompt={setSelectedPrompt}
            loading={loadingPrompts}
          />
        </section>
      </main>
      <PromptPreviewDialog prompt={selectedPrompt} onClose={() => setSelectedPrompt(null)} />
    </div>
  );
}

function HomePromptSection({
  title,
  description,
  prompts,
  moreHref,
  copyPrompt,
  openPrompt,
  loading
}: {
  title: string;
  description: string;
  prompts: PromptItem[];
  moreHref: string;
  copyPrompt: (prompt: PromptItem) => void;
  openPrompt: (prompt: PromptItem) => void;
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Link href={moreHref} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
          浏览更多
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <HomePromptSkeleton key={index} />)
          : prompts.map((prompt) => (
              <HomePromptCard key={prompt.id} prompt={prompt} copyPrompt={copyPrompt} openPrompt={openPrompt} />
            ))}
      </div>
    </section>
  );
}

function HomePromptSkeleton() {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="aspect-[4/5] animate-pulse bg-slate-100" />
      <div className="space-y-3 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-6 w-14 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-px bg-line" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      </div>
    </article>
  );
}

function HomePromptCard({
  prompt,
  copyPrompt,
  openPrompt
}: {
  prompt: PromptItem;
  copyPrompt: (prompt: PromptItem) => void;
  openPrompt: (prompt: PromptItem) => void;
}) {
  const display = getImageDisplayMeta(prompt);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-soft">
      <button type="button" onClick={() => openPrompt(prompt)} className="block w-full text-left" aria-label={`查看 ${prompt.title}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
          <Image
            src={prompt.image}
            alt={prompt.title}
            fill
            sizes="(max-width: 768px) 50vw, 20vw"
            className={homepageImageClass(prompt)}
          />
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-brand-700 backdrop-blur">
            可生成同款
          </span>
          {display.badge && (
            <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-1 text-xs font-medium text-white backdrop-blur">
              {display.badge}
            </span>
          )}
          {display.isComplex && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-100 to-transparent" />
          )}
        </div>
      </button>
      <div className="space-y-3 p-3">
        <button
          type="button"
          onClick={() => openPrompt(prompt)}
          className="line-clamp-2 min-h-10 text-left text-sm font-semibold leading-5 text-ink hover:text-brand-700"
        >
          {prompt.title}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {prompt.tags.slice(0, 2).map((tag) => (
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
              onClick={() => copyPrompt(prompt)}
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
