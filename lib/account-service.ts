import { prisma } from "@/lib/prisma";
import { creditLogs, generationLogs } from "@/lib/mock-data";

type CreditRecord = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: Date;
};

type GenerationRecord = {
  id: string;
  status: string;
  costCredits: number;
  creatorShareCredits: number;
  provider: string;
  providerModel: string;
  createdAt: Date;
  completedAt: Date | null;
  prompt: {
    title: string;
    slug: string;
  };
  resultAsset: {
    publicUrl: string | null;
  } | null;
};

export async function getAccountActivity(userId?: string) {
  try {
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { email: "demo@promptbay.local" } });

    if (!user) {
      return mockAccountActivity();
    }

    const [credits, generations] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.imageGeneration.findMany({
        where: { userId: user.id },
        include: {
          prompt: { select: { title: true, slug: true } },
          resultAsset: { select: { publicUrl: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);

    return {
      user: {
        id: user.id,
        name: user.name ?? "Demo User",
        email: user.email,
        creditBalance: user.creditBalance
      },
      credits: (credits as CreditRecord[]).map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount,
        balanceAfter: item.balanceAfter,
        note: item.note,
        createdAt: item.createdAt
      })),
      generations: (generations as GenerationRecord[]).map((item) => ({
        id: item.id,
        promptTitle: item.prompt.title,
        promptSlug: item.prompt.slug,
        status: item.status,
        costCredits: item.costCredits,
        creatorShareCredits: item.creatorShareCredits,
        resultImageUrl: item.resultAsset?.publicUrl,
        provider: item.provider,
        providerModel: item.providerModel,
        createdAt: item.createdAt,
        completedAt: item.completedAt
      }))
    };
  } catch {
    return mockAccountActivity();
  }
}

function mockAccountActivity() {
  return {
    user: {
      id: "demo",
      name: "设计师 Demo",
      email: "demo@promptbay.local",
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
    generations: generationLogs.map((item, index) => ({
      id: `mock-generation-${index}`,
      promptTitle: item.prompt,
      promptSlug: "",
      status: item.status,
      costCredits: item.cost,
      creatorShareCredits: Math.floor(item.cost * 0.2),
      provider: "mock",
      providerModel: "gpt-image-2",
      createdAt: item.time,
      completedAt: item.time
    }))
  };
}
