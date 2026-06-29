"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Coins, Loader2, Search, Settings2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";

type AdminDashboard = {
  stats: {
    publishedPrompts: number;
    pendingSubmissions: number;
    todayGenerations: number;
    creditVolume: number;
  };
  prompts: Array<{
    id: string;
    slug: string;
    title: string;
    category: string;
    author: string;
    costCredits: number;
    usageCount: number;
    reviewStatus: string;
    publishStatus: string;
  }>;
  submissions: Array<{
    id: string;
    title: string;
    user: string;
    status: string;
    rewardCredits: number;
    createdAt: string | Date;
    reviewNote?: string | null;
  }>;
  users: Array<{
    id: string;
    name?: string | null;
    email: string;
    role: string;
    status: string;
    creditBalance: number;
  }>;
  generations: Array<{
    id: string;
    promptTitle: string;
    promptSlug: string;
    user: string;
    status: string;
    costCredits: number;
    creatorShareCredits: number;
    providerModel: string;
    createdAt: string | Date;
  }>;
  settings: Array<{
    key: string;
    label: string;
    value: string;
    valueType: string;
    group: string;
  }>;
};

const emptyDashboard: AdminDashboard = {
  stats: {
    publishedPrompts: 0,
    pendingSubmissions: 0,
    todayGenerations: 0,
    creditVolume: 0
  },
  prompts: [],
  submissions: [],
  users: [],
  generations: [],
  settings: []
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard>(emptyDashboard);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [creditAmount, setCreditAmount] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return dashboard.prompts;
    return dashboard.prompts.filter((item) => item.title.toLowerCase().includes(keyword));
  }, [dashboard.prompts, query]);

  const pendingSubmissions = dashboard.submissions.filter((item) => item.status === "PENDING");

  async function loadDashboard() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard");
      const data = await response.json();
      setDashboard(data);
      setSettingValues(Object.fromEntries(data.settings.map((item: AdminDashboard["settings"][number]) => [item.key, item.value])));
    } catch {
      toast.error("后台数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function reviewSubmission(id: string, status: "APPROVED" | "REJECTED") {
    setDashboard((current) => ({
      ...current,
      submissions: current.submissions.map((item) => (item.id === id ? { ...item, status } : item))
    }));

    try {
      const response = await fetch(`/api/admin/submissions/${encodeURIComponent(id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("审核请求失败");
      toast.success(status === "APPROVED" ? "审核通过，已发放投稿奖励" : "已拒绝投稿");
      loadDashboard();
    } catch {
      toast.error("审核失败，已恢复本地状态");
      loadDashboard();
    }
  }

  async function adjustCredits(userId: string) {
    const amount = Number(creditAmount[userId] ?? 0);
    if (!Number.isInteger(amount) || amount === 0) {
      toast.error("请输入非 0 整数积分");
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: "后台手动调整积分" })
      });

      if (!response.ok) throw new Error("积分调整失败");
      const data = await response.json();

      setDashboard((current) => ({
        ...current,
        users: current.users.map((item) =>
          item.id === userId ? { ...item, creditBalance: data.user.creditBalance } : item
        )
      }));
      setCreditAmount((current) => ({ ...current, [userId]: "" }));
      toast.success("积分已调整");
    } catch {
      toast.error("积分调整失败");
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: dashboard.settings.map((item) => ({
            key: item.key,
            value: settingValues[item.key] ?? item.value
          }))
        })
      });

      if (!response.ok) throw new Error("保存失败");
      const data = await response.json();
      setDashboard((current) => ({ ...current, settings: data.settings }));
      toast.success("系统配置已保存");
    } catch {
      toast.error("系统配置保存失败");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6 p-4 sm:p-6">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["已上架 Prompt", dashboard.stats.publishedPrompts.toLocaleString()],
            ["待审核投稿", dashboard.stats.pendingSubmissions.toLocaleString()],
            ["今日生成", dashboard.stats.todayGenerations.toLocaleString()],
            ["积分流水", dashboard.stats.creditVolume.toLocaleString()]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{loading ? "..." : value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-ink">Prompt 管理</h2>
              <p className="mt-1 text-sm text-slate-500">查看开发者上传与审核通过的 Prompt，后续可扩展上下架与编辑。</p>
            </div>
            <div className="flex gap-2">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-line px-3">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-40 outline-none"
                  placeholder="搜索标题"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button className="rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600">批量上传</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr>
                  <th className="py-3 font-medium">标题</th>
                  <th className="py-3 font-medium">分类</th>
                  <th className="py-3 font-medium">作者</th>
                  <th className="py-3 font-medium">消耗</th>
                  <th className="py-3 font-medium">使用</th>
                  <th className="py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPrompts.slice(0, 12).map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-medium text-ink">{item.title}</td>
                    <td className="py-3 text-slate-600">{item.category}</td>
                    <td className="py-3 text-slate-600">{item.author}</td>
                    <td className="py-3 text-slate-600">{item.costCredits} 积分</td>
                    <td className="py-3 text-slate-600">{item.usageCount}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {publishLabel(item.publishStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" />
              <h2 className="font-semibold text-ink">投稿审核</h2>
            </div>
            <div className="space-y-3">
              {(pendingSubmissions.length ? pendingSubmissions : dashboard.submissions.slice(0, 4)).map((item) => (
                <div key={item.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.user} · {formatTime(item.createdAt)} · 通过奖励 {item.rewardCredits} 积分
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-slate-600">
                      {reviewLabel(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewSubmission(item.id, "APPROVED")}
                      disabled={item.status !== "PENDING"}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={16} />
                      通过
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewSubmission(item.id, "REJECTED")}
                      disabled={item.status !== "PENDING"}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-slate-600 hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={16} />
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Coins size={18} className="text-brand-600" />
                <h2 className="font-semibold text-ink">用户积分管理</h2>
              </div>
              {dashboard.users.slice(0, 6).map((user) => (
                <div key={user.id} className="border-t border-line py-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{user.name ?? user.email}</p>
                      <p className="text-xs text-slate-500">
                        {roleLabel(user.role)} · {user.status}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink">{user.creditBalance.toLocaleString()} 积分</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="number"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500"
                      placeholder="+100 / -20"
                      value={creditAmount[user.id] ?? ""}
                      onChange={(event) => setCreditAmount((current) => ({ ...current, [user.id]: event.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => adjustCredits(user.id)}
                      className="rounded-lg border border-line px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                      调整
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Settings2 size={18} className="text-brand-600" />
                  <h2 className="font-semibold text-ink">系统配置</h2>
                </div>
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {savingSettings && <Loader2 size={15} className="animate-spin" />}
                  保存
                </button>
              </div>
              <div className="grid gap-3">
                {dashboard.settings.map((setting) => (
                  <label key={setting.key} className="grid gap-1">
                    <span className="text-sm text-slate-500">{setting.label}</span>
                    <input
                      className="h-10 rounded-lg border border-line px-3 outline-none focus:border-brand-500"
                      value={settingValues[setting.key] ?? setting.value}
                      onChange={(event) =>
                        setSettingValues((current) => ({ ...current, [setting.key]: event.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-ink">生成记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr>
                  <th className="py-3 font-medium">Prompt</th>
                  <th className="py-3 font-medium">用户</th>
                  <th className="py-3 font-medium">消耗</th>
                  <th className="py-3 font-medium">作者分成</th>
                  <th className="py-3 font-medium">状态</th>
                  <th className="py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dashboard.generations.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-ink">{item.promptTitle}</td>
                    <td className="py-3 text-slate-600">{item.user}</td>
                    <td className="py-3 text-slate-600">{item.costCredits} 积分</td>
                    <td className="py-3 text-slate-600">{item.creatorShareCredits} 积分</td>
                    <td className="py-3">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {generationLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{formatTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function reviewLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待审核",
    APPROVED: "已通过",
    REJECTED: "已拒绝"
  };

  return labels[status] ?? status;
}

function publishLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "草稿",
    PUBLISHED: "已上架",
    ARCHIVED: "已归档"
  };

  return labels[status] ?? status;
}

function generationLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "待处理",
    PROCESSING: "生成中",
    SUCCEEDED: "成功",
    FAILED: "失败",
    REFUNDED: "已退款"
  };

  return labels[status] ?? status;
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    USER: "普通用户",
    DEVELOPER: "开发者",
    ADMIN: "管理员"
  };

  return labels[role] ?? role;
}

function formatTime(value: string | Date) {
  if (value instanceof Date) return value.toLocaleString("zh-CN");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}
