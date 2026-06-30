"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { Bookmark, Coins, CreditCard, History, LogOut, ReceiptText, Search, Sparkles, Upload, UserCircle } from "lucide-react";

const navItems = [
  { label: "首页", href: "/" },
  { label: "Pricing", href: "#pricing" },
  { label: "交流群", href: "#community" },
  {
    label: "API",
    href: "https://useaifor.me/register?aff=CUULWNH2T8YJ",
    external: true
  }
];

export function SiteHeader() {
  const [role, setRole] = useState<"USER" | "DEVELOPER" | "ADMIN" | null>(null);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((session) => {
        if (!cancelled) setRole(session?.user?.role ?? null);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <Sparkles size={19} />
          </span>
          <span className="text-lg font-semibold tracking-normal text-ink">PromptBay</span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center rounded-full border border-line bg-mist px-4 py-2 md:flex">
          <Search size={18} className="text-slate-400" />
          <input
            className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="搜索人像、产品海报、室内设计、国风包装..."
          />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/submit"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
        >
          <Upload size={17} />
          <span className="hidden sm:inline">投稿</span>
        </Link>

        {role === "ADMIN" && (
          <Link
            href="/admin"
            className="hidden h-10 items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 text-sm font-medium text-brand-700 transition hover:bg-brand-100 lg:inline-flex"
          >
            <Sparkles size={17} />
            管理后台
          </Link>
        )}

        <AccountMenu />
      </div>
    </header>
  );
}

function AccountMenu() {
  const [accountState, setAccountState] = useState<
    | { status: "loading" }
    | { status: "unauthenticated" }
    | { status: "authenticated"; credits: number | null; role: "USER" | "DEVELOPER" | "ADMIN" }
  >({ status: "loading" });
  const menuItems = [
    { label: "个人资料", href: "/account#profile", icon: UserCircle, placeholder: true },
    { label: "我的收藏", href: "/account#favorites", icon: Bookmark, placeholder: true },
    { label: "历史记录", href: "/account#history", icon: History },
    { label: "积分流水", href: "/account#credits", icon: ReceiptText },
    { label: "充值", href: "/account#recharge", icon: CreditCard }
  ];

  useEffect(() => {
    let cancelled = false;

    const refreshCredits = (nextCredits?: number) => {
      if (typeof nextCredits === "number") {
        setAccountState((current) =>
          current.status === "authenticated" ? { ...current, credits: nextCredits } : current
        );
        return;
      }

      fetch("/api/account/activity")
        .then((response) => response.json())
        .then((data) => {
          if (!cancelled && typeof data?.user?.creditBalance === "number") {
            setAccountState((current) =>
              current.status === "authenticated" ? { ...current, credits: data.user.creditBalance } : current
            );
          }
        })
        .catch(() => undefined);
    };

    const onCreditsChanged = (event: Event) => {
      const nextCredits = event instanceof CustomEvent ? event.detail?.credits : undefined;
      refreshCredits(typeof nextCredits === "number" ? nextCredits : undefined);
    };

    window.addEventListener("promptbay:credits-changed", onCreditsChanged);

    getSession()
      .then((session) => {
        if (cancelled) return;

        if (!session?.user) {
          setAccountState({ status: "unauthenticated" });
          return;
        }

        const role = session.user.role ?? "USER";
        setAccountState({ status: "authenticated", credits: null, role });

        fetch("/api/account/activity")
          .then((response) => response.json())
          .then((data) => {
            if (!cancelled && typeof data?.user?.creditBalance === "number") {
              setAccountState({ status: "authenticated", credits: data.user.creditBalance, role });
            }
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setAccountState({ status: "unauthenticated" });
      });

    return () => {
      cancelled = true;
      window.removeEventListener("promptbay:credits-changed", onCreditsChanged);
    };
  }, []);

  const logout = () => {
    setAccountState({ status: "unauthenticated" });
    signOut({ callbackUrl: "/login" }).catch(() => {
      window.location.href = "/login";
    });
  };

  if (accountState.status === "unauthenticated") {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-3 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <UserCircle size={18} />
        <span className="hidden sm:inline">登录</span>
      </Link>
    );
  }

  const creditsLabel =
    accountState.status === "authenticated" && accountState.credits !== null
      ? `${accountState.credits.toLocaleString()} 积分`
      : "积分";

  return (
    <div className="group relative">
      <Link
        href="/account"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-3 text-sm font-medium text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <UserCircle size={18} />
        <span className="hidden sm:inline">{creditsLabel}</span>
      </Link>

      {accountState.status === "authenticated" && (
        <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="w-64 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-line bg-brand-50 px-4 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-brand-700 shadow-sm">
                <Coins size={21} />
              </span>
              <div>
                <p className="text-xs text-brand-700">当前积分</p>
                <p className="text-lg font-semibold text-ink">
                  {accountState.credits === null ? "加载中" : accountState.credits.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="py-2">
              {accountState.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  <Sparkles size={17} className="text-brand-500" />
                  管理后台
                </Link>
              )}
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-mist hover:text-brand-700"
                >
                  <span className="inline-flex items-center gap-3">
                    <item.icon size={17} className="text-slate-400" />
                    {item.label}
                  </span>
                  {item.placeholder && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">占位</span>}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-mist hover:text-brand-700"
              >
                <LogOut size={17} className="text-slate-400" />
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
