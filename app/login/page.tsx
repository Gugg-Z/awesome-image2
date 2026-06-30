"use client";

import Link from "next/link";
import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  async function submitAccount(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    setSubmitting(true);

    try {
      if (authMode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.error === "EMAIL_EXISTS") {
            toast.error("该邮箱已注册，请直接登录");
            return;
          }

          const message = data.issues?.fieldErrors
            ? Object.values(data.issues.fieldErrors).flat().filter(Boolean)[0]
            : undefined;
          toast.error(typeof message === "string" ? message : "注册失败，请检查信息");
          return;
        }
      }

      const result = await signIn("demo", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        toast.error(authMode === "register" ? "注册成功，但自动登录失败" : "登录失败，请检查邮箱和密码");
        return;
      }

      const session = await getSession();
      window.location.href = session?.user?.role === "ADMIN" ? "/admin" : "/account";
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <UserPlus size={26} />
          </div>
          <div className="mb-5 flex rounded-lg bg-mist p-1">
            {(["login", "register"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAuthMode(mode)}
                className={
                  authMode === mode
                    ? "h-9 flex-1 rounded-md bg-white text-sm font-semibold text-ink shadow-sm"
                    : "h-9 flex-1 rounded-md text-sm font-medium text-slate-500 transition hover:text-ink"
                }
              >
                {mode === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-semibold text-ink">{authMode === "login" ? "账号登录" : "创建账号"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {authMode === "login" ? "使用邮箱和密码进入你的 PromptBay 账户。" : "注册后将自动登录，普通用户不开放测试充值。"}
          </p>

          <form action={submitAccount} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-ink">邮箱</span>
              <input
                name="email"
                type="email"
                required
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">密码</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                placeholder="至少 8 位"
              />
            </label>

            {authMode === "register" && (
              <label className="block">
                <span className="text-sm font-medium text-ink">昵称</span>
                <input
                  name="name"
                  maxLength={32}
                  className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                  placeholder="选填，未填写将自动生成"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting && <Loader2 size={17} className="animate-spin" />}
              {authMode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>
        </section>

        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand-700">
          返回 Prompt 市集
        </Link>
      </main>
    </div>
  );
}
