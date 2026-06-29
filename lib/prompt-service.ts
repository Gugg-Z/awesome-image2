import { prisma } from "@/lib/prisma";
import { prompts as mockPrompts, type PromptItem } from "@/lib/mock-data";
import { getLocalDataPrompts } from "@/lib/data-prompts";

export type PromptListOptions = {
  query?: string;
  category?: string;
  tag?: string;
  sort?: "hot" | "latest";
  limit?: number;
};

export type PromptSubmissionInput = {
  title: string;
  description?: string;
  positivePrompt: string;
  negativePrompt?: string;
  category: string;
  tags: string[];
  model: string;
  ratio: string;
  userId?: string;
};

export type BulkPromptInput = {
  title: string;
  description?: string;
  positivePrompt: string;
  negativePrompt?: string;
  category: string;
  tags: string[];
  model: string;
  ratio: string;
  costCredits?: number;
  imageUrl?: string;
  authorId?: string;
};

export async function listPrompts(options: PromptListOptions = {}) {
  try {
    const where = publishedPromptWhere(options);
    const prompts = await prisma.prompt.findMany({
      where,
      include: promptInclude,
      orderBy: orderByFor(options.sort),
      take: options.limit ?? 50
    });

    return prompts.map(mapPromptRecord);
  } catch {
    return listMockPrompts(options);
  }
}

export async function getPromptById(idOrSlug: string) {
  try {
    const prompt = await prisma.prompt.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED"
      },
      include: promptInclude
    });

    return prompt ? mapPromptRecord(prompt) : getMockPromptById(idOrSlug);
  } catch {
    return getMockPromptById(idOrSlug);
  }
}

export async function recordPromptCopy(idOrSlug: string) {
  try {
    const prompt = await prisma.prompt.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true }
    });

    if (!prompt) return getMockPromptById(idOrSlug);

    const updated = await prisma.prompt.update({
      where: { id: prompt.id },
      data: { copyCount: { increment: 1 } },
      include: promptInclude
    });

    return mapPromptRecord(updated);
  } catch {
    return getMockPromptById(idOrSlug);
  }
}

export async function createPromptSubmission(input: PromptSubmissionInput) {
  try {
    const userId = input.userId ?? (await ensureDemoUser()).id;

    return await prisma.promptSubmission.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        positivePrompt: input.positivePrompt,
        negativePrompt: input.negativePrompt,
        category: input.category,
        tags: input.tags,
        model: input.model,
        ratio: input.ratio,
        rewardCredits: 30
      }
    });
  } catch {
    return {
      id: `mock-${Date.now()}`,
      status: "PENDING",
      rewardCredits: 30,
      ...input
    };
  }
}

export async function listSubmissions(status?: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    return await prisma.promptSubmission.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  } catch {
    return [];
  }
}

export async function reviewSubmission(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  reviewerId?: string;
  reviewNote?: string;
}) {
  try {
    const reviewerId = input.reviewerId ?? (await ensureDemoAdmin()).id;
    const submission = await prisma.promptSubmission.findUnique({
      where: { id: input.id }
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    if (input.status === "REJECTED") {
      return await prisma.promptSubmission.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          reviewerId,
          reviewNote: input.reviewNote,
          reviewedAt: new Date()
        }
      });
    }

    return await prisma.$transaction(async (tx: any) => {
      const prompt = await tx.prompt.create({
        data: {
          slug: await uniqueSlug(submission.title),
          title: submission.title,
          description: submission.description,
          positivePrompt: submission.positivePrompt,
          negativePrompt: submission.negativePrompt,
          category: submission.category,
          tags: submission.tags,
          model: submission.model,
          ratio: submission.ratio,
          costCredits: 10,
          source: "USER_SUBMISSION",
          reviewStatus: "APPROVED",
          publishStatus: "PUBLISHED",
          authorId: submission.userId,
          reviewerId,
          reviewedAt: new Date()
        }
      });

      const updated = await tx.promptSubmission.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          promptId: prompt.id,
          reviewerId,
          reviewNote: input.reviewNote,
          reviewedAt: new Date()
        }
      });

      const user = await tx.user.update({
        where: { id: submission.userId },
        data: { creditBalance: { increment: submission.rewardCredits } }
      });

      await tx.creditTransaction.create({
        data: {
          userId: submission.userId,
          type: "SUBMISSION_REWARD",
          amount: submission.rewardCredits,
          balanceAfter: user.creditBalance,
          note: `投稿审核通过：${submission.title}`,
          metadata: { submissionId: submission.id, promptId: prompt.id }
        }
      });

      return updated;
    });
  } catch {
    return {
      id: input.id,
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedAt: new Date()
    };
  }
}

export async function bulkImportPrompts(items: BulkPromptInput[]) {
  try {
    const admin = await ensureDemoAdmin();
    const created = [];

    for (const item of items) {
      const prompt = await prisma.prompt.create({
        data: {
          slug: await uniqueSlug(item.title),
          title: item.title,
          description: item.description,
          positivePrompt: item.positivePrompt,
          negativePrompt: item.negativePrompt,
          category: item.category,
          tags: item.tags,
          model: item.model,
          ratio: item.ratio,
          costCredits: item.costCredits ?? 10,
          source: "DEVELOPER_UPLOAD",
          reviewStatus: "APPROVED",
          publishStatus: "PUBLISHED",
          authorId: item.authorId ?? admin.id,
          reviewerId: admin.id,
          reviewedAt: new Date()
        }
      });

      if (item.imageUrl) {
        const asset = await prisma.asset.create({
          data: {
            kind: "PROMPT_EXAMPLE",
            provider: "LOCAL",
            objectKey: item.imageUrl,
            publicUrl: item.imageUrl,
            mimeType: "image/jpeg",
            sizeBytes: 0
          }
        });

        await prisma.promptImage.create({
          data: {
            promptId: prompt.id,
            assetId: asset.id,
            isPrimary: true
          }
        });
      }

      created.push(prompt);
    }

    return created;
  } catch {
    return items.map((item, index) => ({
      id: `mock-import-${Date.now()}-${index}`,
      ...item
    }));
  }
}

const promptInclude = {
  author: { select: { id: true, name: true, email: true } },
  images: {
    include: { asset: true },
    orderBy: { sortOrder: "asc" as const }
  }
};

type PromptRecord = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  positivePrompt: string;
  negativePrompt: string | null;
  model: string;
  ratio: string;
  costCredits: number;
  usageCount: number;
  likeCount: number;
  author: {
    name: string | null;
    email: string | null;
  } | null;
  images: Array<{
    isPrimary: boolean;
    asset: {
      publicUrl: string | null;
    };
  }>;
};

function publishedPromptWhere(options: PromptListOptions) {
  const and: any[] = [
    { reviewStatus: "APPROVED" },
    { publishStatus: "PUBLISHED" }
  ];

  if (options.category && options.category !== "全部") {
    and.push({ category: options.category });
  }

  if (options.tag) {
    and.push({ tags: { has: options.tag } });
  }

  if (options.query) {
    and.push({
      OR: [
        { title: { contains: options.query, mode: "insensitive" } },
        { description: { contains: options.query, mode: "insensitive" } },
        { positivePrompt: { contains: options.query, mode: "insensitive" } }
      ]
    });
  }

  return { AND: and };
}

function orderByFor(sort: PromptListOptions["sort"]) {
  if (sort === "latest") return { createdAt: "desc" as const };
  return { usageCount: "desc" as const };
}

function mapPromptRecord(prompt: PromptRecord): PromptItem {
  const image =
    prompt.images.find((item) => item.isPrimary)?.asset.publicUrl ??
    prompt.images[0]?.asset.publicUrl ??
    mockPrompts[0].image;

  return {
    id: prompt.slug,
    title: prompt.title,
    category: prompt.category,
    tags: prompt.tags,
    image,
    height: 460,
    prompt: prompt.positivePrompt,
    negativePrompt: prompt.negativePrompt ?? "",
    model: prompt.model,
    ratio: prompt.ratio,
    cost: prompt.costCredits,
    author: prompt.author?.name ?? prompt.author?.email ?? "PromptBay",
    uses: prompt.usageCount,
    likes: prompt.likeCount,
    status: "published"
  };
}

function listMockPrompts(options: PromptListOptions) {
  const sourcePrompts = getLocalDataPrompts().length ? getLocalDataPrompts() : mockPrompts;
  const filtered = sourcePrompts.filter((prompt) => {
    const matchQuery =
      !options.query ||
      prompt.title.toLowerCase().includes(options.query.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(options.query.toLowerCase()) ||
      prompt.tags.some((item) => item.toLowerCase().includes(options.query!.toLowerCase()));
    const matchCategory = !options.category || options.category === "全部" || prompt.category === options.category;
    const matchTag = !options.tag || prompt.tags.includes(options.tag);
    return matchQuery && matchCategory && matchTag;
  });

  const sorted =
    options.sort === "latest"
      ? filtered
      : [...filtered].sort((a, b) => b.uses - a.uses);

  return sorted.slice(0, options.limit ?? sorted.length);
}

function getMockPromptById(idOrSlug: string) {
  const sourcePrompts = getLocalDataPrompts().length ? getLocalDataPrompts() : mockPrompts;
  return sourcePrompts.find((prompt) => prompt.id === idOrSlug) ?? null;
}

async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@promptbay.local" },
    update: {},
    create: {
      email: "demo@promptbay.local",
      name: "Demo User",
      creditBalance: 1280
    }
  });
}

async function ensureDemoAdmin() {
  return prisma.user.upsert({
    where: { email: "admin@promptbay.local" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@promptbay.local",
      name: "PromptBay Admin",
      role: "ADMIN",
      creditBalance: 9999
    }
  });
}

async function uniqueSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let counter = 1;

  while (await prisma.prompt.findUnique({ where: { slug }, select: { id: true } })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }

  return slug;
}

function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `prompt-${Date.now()}`;
}
