"use client";

import Link from "next/link";
import { useState } from "react";
import { ImagePlus, Info, Loader2, Send, Tag } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";

export default function SubmitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      toast.success("投稿已进入待审核，审核通过后奖励 30 积分");
      event.currentTarget.reset();
    } catch {
      toast.error("投稿提交失败，请检查必填内容后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-brand-100 bg-brand-50 text-center">
            <div>
              <ImagePlus className="mx-auto text-brand-600" size={42} />
              <p className="mt-3 text-sm font-semibold text-ink">上传示例图</p>
              <p className="mt-1 text-xs text-slate-500">图片上传会在下一阶段接入，本阶段先提交 Prompt 内容</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-mist p-3 text-sm leading-6 text-slate-600">
            投稿会先进入审核。通过后自动获得基础奖励，后续其他用户生成同款时你还会获得分成积分。
          </div>
        </section>

        <form onSubmit={submit} className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm text-slate-500">用户投稿</p>
            <h1 className="text-2xl font-semibold text-ink">提交一个可生成同款的 Prompt</h1>
          </div>
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">标题</span>
              <input
                name="title"
                required
                minLength={2}
                className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand-500"
                placeholder="例如：极简香水产品海报"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">正向 Prompt</span>
              <textarea
                name="positivePrompt"
                required
                minLength={10}
                className="min-h-32 rounded-lg border border-line p-3 leading-6 outline-none focus:border-brand-500"
                placeholder="描述画面主体、光线、镜头、材质、风格..."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">负向 Prompt</span>
              <textarea
                name="negativePrompt"
                className="min-h-24 rounded-lg border border-line p-3 leading-6 outline-none focus:border-brand-500"
                placeholder="低质量、模糊、畸形、文字水印..."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">分类</span>
                <select name="category" className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand-500">
                  <option>商品与电商</option>
                  <option>摄影与写实</option>
                  <option>海报与排版</option>
                  <option>角色与人物</option>
                  <option>建筑与空间</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">模型</span>
                <select name="model" className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand-500">
                  <option>gpt-image-2</option>
                  <option>gpt-image-1</option>
                  <option>其他模型</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-ink">比例</span>
                <select name="ratio" className="h-11 rounded-lg border border-line px-3 outline-none focus:border-brand-500">
                  <option>auto</option>
                  <option>4:5</option>
                  <option>1:1</option>
                  <option>16:9</option>
                  <option>9:16</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-ink">风格标签</span>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-line px-3 focus-within:border-brand-500">
                <Tag size={16} className="text-slate-400" />
                <input name="tags" className="w-full outline-none" placeholder="电影感, 产品, 柔光" />
              </div>
            </label>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-sm leading-6 text-brand-700">
            <Info size={18} className="mt-0.5 shrink-0" />
            审核通过后奖励 30 积分。其他用户使用该 Prompt 生成同款时，将按后台配置比例返还作者积分。
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/" className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-slate-600 hover:bg-mist">
              返回首页
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              {isSubmitting ? "提交中" : "提交审核"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
