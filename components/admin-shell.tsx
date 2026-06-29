import Link from "next/link";
import { BarChart3, Coins, FileCheck2, ImageIcon, Settings, Users, WandSparkles } from "lucide-react";

const adminNav = [
  { label: "Prompt 管理", icon: ImageIcon },
  { label: "投稿审核", icon: FileCheck2 },
  { label: "用户积分", icon: Users },
  { label: "生成记录", icon: BarChart3 },
  { label: "系统配置", icon: Settings }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mist">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-line px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <WandSparkles size={18} />
          </span>
          <div>
            <p className="font-semibold text-ink">PromptBay</p>
            <p className="text-xs text-slate-500">管理后台</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {adminNav.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                index === 0 ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-mist hover:text-ink"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/92 px-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-sm text-slate-500">后台管理</p>
            <h1 className="text-lg font-semibold text-ink">内容与积分管理</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 sm:inline-flex">
              <Coins size={16} />
              积分与生成可追踪
            </span>
            <Link href="/" className="rounded-full border border-line bg-white px-3 py-2 text-sm text-slate-600 hover:bg-mist">
              返回前台
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
