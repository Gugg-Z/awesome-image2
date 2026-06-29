"use client";

import Link from "next/link";
import { Search, Sparkles, Upload, UserCircle } from "lucide-react";

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

        <Link
          href="/account"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-3 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <UserCircle size={18} />
          <span className="hidden sm:inline">1280 积分</span>
        </Link>
      </div>
    </header>
  );
}
