"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Coins, CreditCard, FileClock, History, ImageIcon, Loader2, PlusCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { creditLogs, generationLogs } from "@/lib/mock-data";

type AccountActivity = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "DEVELOPER" | "ADMIN";
    creditBalance: number;
  };
  credits: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    note?: string | null;
    createdAt: string | Date;
  }>;
  generations: Array<{
    id: string;
    promptTitle: string;
    promptSlug: string;
    status: string;
    costCredits: number;
    creatorShareCredits: number;
    providerModel: string;
    createdAt: string | Date;
  }>;
  submissions: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string | Date;
  }>;
};

type RechargePackage = {
  id: string;
  name: string;
  credits: number;
  amountCents: number;
};

const fallbackActivity: AccountActivity = {
  user: {
    id: "demo",
    name: "设计师 Demo",
    email: "demo@promptbay.local",
    role: "USER",
    creditBalance: 1280
  },
  credits: creditLogs.map((item, index) => ({
    id: `mock-credit-${index}`,
    type: item.type,
    amount: item.amount,
    balanceAfter: 1280,
    note: item.note,
    createdAt: item.time
  })),
  submissions: [],
  generations: generationLogs.map((item, index) => ({
    id: `mock-generation-${index}`,
    promptTitle: item.prompt,
    promptSlug: "",
    status: item.status,
    costCredits: item.cost,
    creatorShareCredits: Math.floor(item.cost * 0.2),
    providerModel: "gpt-image-2",
    createdAt: item.time
  }))
};

export default function AccountPage() {
  const [activity, setActivity] = useState<AccountActivity>(fallbackActivity);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargingId, setRechargingId] = useState<string | null>(null);
  const canUseMockRecharge = activity.user.role !== "USER";

  useEffect(() => {
    let cancelled = false;

    loadActivity(cancelled);

    fetch("/api/recharge/packages")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setPackages(data.packages ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function loadActivity(cancelled = false) {
    setLoading(true);

    return fetch("/api/account/activity")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch(() => {
        if (!cancelled) setActivity(fallbackActivity);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }

  async function recharge(packageId: string) {
    setRechargingId(packageId);

    try {
      const response = await fetch("/api/recharge/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId })
      });

      if (!response.ok) throw new Error("充值失败");
      const data = await response.json();
      if (typeof data?.recharge?.balanceAfter === "number") {
        window.dispatchEvent(new CustomEvent("promptbay:credits-changed", { detail: { credits: data.recharge.balanceAfter } }));
      }
      await loadActivity();
    } finally {
      setRechargingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section id="profile" className="mb-6 grid scroll-mt-24 gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">当前账户</p>
                <h1 className="mt-1 text-2xl font-semibold text-ink">{activity.user.name}</h1>
              </div>
              {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Coins size={24} />
              </span>
              <div>
                <p className="text-3xl font-semibold text-ink">{activity.user.creditBalance.toLocaleString()}</p>
                <p className="text-sm text-slate-500">可用积分</p>
              </div>
            </div>
          </div>

          {[
            { icon: ImageIcon, value: activity.generations.length, label: "生成记录" },
            { icon: FileClock, value: activity.submissions.length, label: "我的投稿" }
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <item.icon className="text-brand-600" size={24} />
              <p className="mt-5 text-3xl font-semibold text-ink">{item.value}</p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div id="favorites" className="rounded-xl border border-line bg-white p-5 shadow-sm scroll-mt-24 lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <ImageIcon size={18} className="text-brand-600" />
              <h2 className="font-semibold text-ink">我的收藏</h2>
            </div>
            <p className="text-sm text-slate-500">收藏夹功能后续接入，这里先保留入口位置。</p>
          </div>

          <div id="recharge" className="rounded-xl border border-line bg-white p-5 shadow-sm scroll-mt-24 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-brand-600" />
              <h2 className="font-semibold text-ink">{canUseMockRecharge ? "测试充值" : "积分充值"}</h2>
            </div>
            {canUseMockRecharge ? (
              <div className="grid gap-3 md:grid-cols-3">
                {packages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => recharge(item.id)}
                    disabled={rechargingId === item.id}
                    className="flex items-center justify-between rounded-lg border border-line p-4 text-left transition hover:border-brand-100 hover:bg-brand-50 disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">{item.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{(item.amountCents / 100).toFixed(2)} 元</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                      {rechargingId === item.id && <Loader2 size={14} className="animate-spin" />}
                      +{item.credits}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-mist p-4 text-sm leading-6 text-slate-600">
                测试充值入口不对普通用户开放。正式支付通道接入后，这里会展示可购买的积分套餐。
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-ink">投稿记录</h2>
              <Link href="/submit" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                <PlusCircle size={16} />
                新投稿
              </Link>
            </div>
            <div className="space-y-3">
              {activity.submissions.length ? (
                activity.submissions.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-line p-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {shortId(item.id)} · {formatTime(item.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{reviewStatusLabel(item.status)}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-mist p-4 text-sm text-slate-500">
                  暂无投稿记录。提交第一个 Prompt 后会显示在这里。
                </div>
              )}
            </div>
          </div>

          <div id="credits" className="rounded-xl border border-line bg-white p-5 shadow-sm scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <History size={18} className="text-brand-600" />
              <h2 className="font-semibold text-ink">积分流水</h2>
            </div>
            <div className="space-y-3">
              {activity.credits.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-mist p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{transactionLabel(item.type)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.note ?? "积分变动"} · {formatTime(item.createdAt)}
                    </p>
                  </div>
                  <span className={item.amount > 0 ? "font-semibold text-brand-700" : "font-semibold text-slate-700"}>
                    {item.amount > 0 ? "+" : ""}
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div id="history" className="rounded-xl border border-line bg-white p-5 shadow-sm scroll-mt-24 lg:col-span-2">
            <h2 className="mb-4 font-semibold text-ink">生成记录</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-slate-500">
                  <tr>
                    <th className="py-3 font-medium">Prompt</th>
                    <th className="py-3 font-medium">消耗</th>
                    <th className="py-3 font-medium">作者分成</th>
                    <th className="py-3 font-medium">状态</th>
                    <th className="py-3 font-medium">模型</th>
                    <th className="py-3 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {activity.generations.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 text-ink">{item.promptTitle}</td>
                      <td className="py-3 text-slate-600">{item.costCredits} 积分</td>
                      <td className="py-3 text-slate-600">{item.creatorShareCredits} 积分</td>
                      <td className="py-3">
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{item.providerModel}</td>
                      <td className="py-3 text-slate-500">{formatTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    RECHARGE: "充值",
    GENERATION_DEBIT: "生成同款",
    GENERATION_REFUND: "生成退款",
    SUBMISSION_REWARD: "投稿奖励",
    CREATOR_SHARE: "作者分成",
    ADMIN_ADJUSTMENT: "后台调整"
  };

  return labels[type] ?? type;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待处理",
    PROCESSING: "生成中",
    SUCCEEDED: "成功",
    FAILED: "失败",
    REFUNDED: "已退款"
  };

  return labels[status] ?? status;
}

function reviewStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "已通过",
    REJECTED: "已拒绝"
  };

  return labels[status] ?? status;
}

function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function formatTime(value: string | Date) {
  if (value instanceof Date) return value.toLocaleString("zh-CN");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}
