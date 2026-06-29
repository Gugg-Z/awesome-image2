import { prisma } from "@/lib/prisma";
import { getLocalDataPrompts } from "@/lib/data-prompts";
import { generationLogs, prompts as mockPrompts, submissions as mockSubmissions } from "@/lib/mock-data";

type PromptRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  costCredits: number;
  usageCount: number;
  reviewStatus: string;
  publishStatus: string;
  createdAt: Date;
  author: {
    name: string | null;
    email: string | null;
  } | null;
};

type SubmissionRecord = {
  id: string;
  title: string;
  status: string;
  rewardCredits: number;
  createdAt: Date;
  reviewNote: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
};

type GenerationRecord = {
  id: string;
  status: string;
  costCredits: number;
  creatorShareCredits: number;
  provider: string;
  providerModel: string;
  createdAt: Date;
  prompt: {
    title: string;
    slug: string;
  };
  user: {
    name: string | null;
    email: string | null;
  };
};

type SettingRecord = {
  key: string;
  label: string | null;
  value: string;
  valueType: string;
  group: string | null;
};

const defaultSettings = [
  { key: "generation.default_cost", label: "默认生成单价", value: "10", valueType: "NUMBER", group: "credits" },
  { key: "submission.reward_credits", label: "投稿通过奖励", value: "30", valueType: "NUMBER", group: "credits" },
  { key: "creator.share_rate", label: "作者分成比例", value: "20", valueType: "NUMBER", group: "credits" },
  { key: "generation.default_model", label: "默认生成模型", value: "gpt-image-2", valueType: "STRING", group: "generation" }
] as const;

export async function getAdminDashboard() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats, prompts, submissions, users, generations, settings] = await Promise.all([
      getAdminStats(today),
      prisma.prompt.findMany({
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.promptSubmission.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.user.findMany({
        orderBy: { creditBalance: "desc" },
        take: 20,
        select: { id: true, name: true, email: true, role: true, status: true, creditBalance: true }
      }),
      prisma.imageGeneration.findMany({
        include: {
          prompt: { select: { title: true, slug: true } },
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      getSystemSettings()
    ]);

    return {
      stats,
      prompts: (prompts as PromptRecord[]).map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        category: item.category,
        author: item.author?.name ?? item.author?.email ?? "PromptBay",
        costCredits: item.costCredits,
        usageCount: item.usageCount,
        reviewStatus: item.reviewStatus,
        publishStatus: item.publishStatus,
        createdAt: item.createdAt
      })),
      submissions: (submissions as SubmissionRecord[]).map((item) => ({
        id: item.id,
        title: item.title,
        user: item.user.name ?? item.user.email ?? "用户",
        status: item.status,
        rewardCredits: item.rewardCredits,
        createdAt: item.createdAt,
        reviewNote: item.reviewNote
      })),
      users,
      generations: (generations as GenerationRecord[]).map((item) => ({
        id: item.id,
        promptTitle: item.prompt.title,
        promptSlug: item.prompt.slug,
        user: item.user.name ?? item.user.email ?? "用户",
        status: item.status,
        costCredits: item.costCredits,
        creatorShareCredits: item.creatorShareCredits,
        provider: item.provider,
        providerModel: item.providerModel,
        createdAt: item.createdAt
      })),
      settings
    };
  } catch {
    return mockDashboard();
  }
}

export async function adjustUserCredits(input: {
  userId: string;
  amount: number;
  note?: string;
}) {
  try {
    return await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: input.userId },
        data: { creditBalance: { increment: input.amount } },
        select: { id: true, name: true, email: true, creditBalance: true }
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: "ADMIN_ADJUSTMENT",
          amount: input.amount,
          balanceAfter: user.creditBalance,
          note: input.note ?? "后台手动调整积分"
        }
      });

      return user;
    });
  } catch {
    return {
      id: input.userId,
      name: "Demo User",
      email: "demo@promptbay.local",
      creditBalance: 1280 + input.amount
    };
  }
}

export async function getSystemSettings() {
  try {
    const existingSettings = await prisma.systemSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }]
    });

    if (!existingSettings.length) {
      return defaultSettings;
    }

    return (existingSettings as SettingRecord[]).map((item) => ({
      key: item.key,
      label: item.label ?? item.key,
      value: item.value,
      valueType: item.valueType,
      group: item.group ?? "general"
    }));
  } catch {
    return defaultSettings;
  }
}

export async function updateSystemSettings(settings: Array<{ key: string; value: string }>) {
  try {
    const saved = [];

    for (const setting of settings) {
      const defaultSetting = defaultSettings.find((item) => item.key === setting.key);
      saved.push(
        await prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            key: setting.key,
            value: setting.value,
            valueType: defaultSetting?.valueType ?? "STRING",
            label: defaultSetting?.label ?? setting.key,
            group: defaultSetting?.group ?? "general"
          }
        })
      );
    }

    return (saved as SettingRecord[]).map((item) => ({
      key: item.key,
      label: item.label ?? item.key,
      value: item.value,
      valueType: item.valueType,
      group: item.group ?? "general"
    }));
  } catch {
    return defaultSettings.map((item) => ({
      ...item,
      value: settings.find((setting) => setting.key === item.key)?.value ?? item.value
    }));
  }
}

async function getAdminStats(today: Date) {
  const [publishedPrompts, pendingSubmissions, todayGenerations, creditAgg] = await Promise.all([
    prisma.prompt.count({ where: { publishStatus: "PUBLISHED" } }),
    prisma.promptSubmission.count({ where: { status: "PENDING" } }),
    prisma.imageGeneration.count({ where: { createdAt: { gte: today } } }),
    prisma.creditTransaction.aggregate({ _sum: { amount: true } })
  ]);

  return {
    publishedPrompts,
    pendingSubmissions,
    todayGenerations,
    creditVolume: creditAgg._sum.amount ?? 0
  };
}

function mockDashboard() {
  const localPrompts = getLocalDataPrompts().length ? getLocalDataPrompts() : mockPrompts;

  return {
    stats: {
      publishedPrompts: localPrompts.length,
      pendingSubmissions: mockSubmissions.length,
      todayGenerations: generationLogs.length,
      creditVolume: 8924
    },
    prompts: localPrompts.slice(0, 12).map((item) => ({
      id: item.id,
      slug: item.id,
      title: item.title,
      category: item.category,
      author: item.author,
      costCredits: item.cost,
      usageCount: item.uses,
      reviewStatus: "APPROVED",
      publishStatus: "PUBLISHED",
      createdAt: new Date().toISOString()
    })),
    submissions: mockSubmissions.map((item) => ({
      id: item.id,
      title: item.title,
      user: item.user,
      status: item.status.includes("拒") ? "REJECTED" : item.status.includes("通过") ? "APPROVED" : "PENDING",
      rewardCredits: item.reward,
      createdAt: item.date,
      reviewNote: ""
    })),
    users: [
      { id: "demo", name: "设计师 Demo", email: "demo@promptbay.local", role: "USER", status: "ACTIVE", creditBalance: 1280 },
      { id: "creator", name: "Mira", email: "mira@promptbay.local", role: "DEVELOPER", status: "ACTIVE", creditBalance: 4820 },
      { id: "studio", name: "Studio Q", email: "studio@promptbay.local", role: "ADMIN", status: "ACTIVE", creditBalance: 9110 }
    ],
    generations: generationLogs.map((item, index) => ({
      id: `mock-generation-${index}`,
      promptTitle: item.prompt,
      promptSlug: "",
      user: "设计师 Demo",
      status: item.status.includes("失败") ? "FAILED" : "SUCCEEDED",
      costCredits: item.cost,
      creatorShareCredits: Math.floor(item.cost * 0.2),
      provider: "mock",
      providerModel: "gpt-image-2",
      createdAt: item.time
    })),
    settings: defaultSettings
  };
}
