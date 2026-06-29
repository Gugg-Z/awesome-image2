"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PromptCard } from "@/components/prompt-card";
import { PromptPreviewDialog } from "@/components/prompt-preview-dialog";
import { categories, prompts, type PromptItem } from "@/lib/mock-data";
import { fetchPrompts } from "@/lib/prompt-client";

export function ExploreContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [items, setItems] = useState(prompts);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);

  useEffect(() => {
    const urlCategory = searchParams.get("category");
    const urlTag = searchParams.get("tag");

    if (urlCategory) setCategory(urlCategory);
    if (urlTag) setQuery(urlTag);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    fetchPrompts({
      category: category === "全部" ? undefined : category,
      query: query || undefined,
      limit: 120
    })
      .then((data) => {
        if (cancelled) return;
        setItems(data.prompts);
        if (data.categories?.length) {
          setAvailableCategories(data.categories);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setItems(prompts);
        setAvailableCategories(categories);
      });

    return () => {
      cancelled = true;
    };
  }, [category, query]);

  const filteredPrompts = useMemo(() => {
    return items.filter((prompt) => {
      const matchQuery =
        !query ||
        prompt.title.toLowerCase().includes(query.toLowerCase()) ||
        prompt.prompt.toLowerCase().includes(query.toLowerCase()) ||
        prompt.tags.some((item) => item.toLowerCase().includes(query.toLowerCase()));
      const matchCategory = category === "全部" || prompt.category === category;
      return matchQuery && matchCategory;
    });
  }, [category, items, query]);

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-5 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-700">完整图库</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink">浏览全部 Prompt</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                按分类、关键词和热门程度继续探索。复杂长图会优先完整预览，详情页可查看完整原图。
              </p>
            </div>
            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-mist px-3 lg:w-96">
              <Search size={18} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="搜索 prompt、风格、场景..."
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-clean">
              <Filter size={17} className="shrink-0 text-slate-400" />
              {availableCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
                    category === item ? "bg-ink text-white" : "bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500">共 {filteredPrompts.length} 个 Prompt，按热门排序</p>
          </div>

          <div className="masonry columns-2 md:columns-3 xl:columns-4">
            {filteredPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} onOpen={setSelectedPrompt} />
            ))}
          </div>
        </section>
      </main>
      <PromptPreviewDialog prompt={selectedPrompt} onClose={() => setSelectedPrompt(null)} />
    </div>
  );
}
