"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  const [loadingRole, setLoadingRole] = useState<"user" | "admin" | null>(null);

  async function login(role: "user" | "admin") {
    setLoadingRole(role);

    const result = await signIn("demo", {
      role,
      redirect: false
    });

    setLoadingRole(null);

    if (result?.error) {
      toast.error("登录失败，请检查 DEMO_LOGIN_ENABLED 配置");
      return;
    }

    window.location.href = role === "admin" ? "/admin" : "/account";
  }

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <UserCircle size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Demo 用户登录</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">用于验证投稿、生成同款、充值和积分流水等普通用户流程。</p>
          <button
            type="button"
            onClick={() => login("user")}
            disabled={loadingRole !== null}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loadingRole === "user" && <Loader2 size={17} className="animate-spin" />}
            以用户身份进入
          </button>
        </section>

        <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-2xl font-semibold text-ink">Demo 管理员登录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">用于验证后台审核、积分调整、系统配置和管理权限校验。</p>
          <button
            type="button"
            onClick={() => login("admin")}
            disabled={loadingRole !== null}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loadingRole === "admin" && <Loader2 size={17} className="animate-spin" />}
            以管理员身份进入
          </button>
        </section>

        <Link href="/" className="text-sm font-medium text-brand-700 md:col-span-2">
          返回 Prompt 市集
        </Link>
      </main>
    </div>
  );
}
