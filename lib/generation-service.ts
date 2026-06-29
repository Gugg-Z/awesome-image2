import { prisma } from "@/lib/prisma";
import { getPromptById } from "@/lib/prompt-service";
import { generatePromptImage } from "@/lib/image-provider";

const defaultCreatorShareRate = 0.2;

export type GenerateFromPromptResult = {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED";
  costCredits: number;
  creatorShareCredits: number;
  balanceAfter: number;
  resultImageUrl?: string;
  provider: string;
  providerModel: string;
  errorMessage?: string;
};

export class InsufficientCreditsError extends Error {
  constructor(public readonly balance: number, public readonly required: number) {
    super("Insufficient credits");
  }
}

export async function generateImageFromPrompt(input: {
  promptId: string;
  userId?: string;
}): Promise<GenerateFromPromptResult> {
  const prompt = await getPromptById(input.promptId);

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  try {
    const user = input.userId
      ? await prisma.user.findUnique({ where: { id: input.userId } })
      : await ensureDemoUser();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.creditBalance < prompt.cost) {
      throw new InsufficientCreditsError(user.creditBalance, prompt.cost);
    }

    const promptRecord = await prisma.prompt.findFirst({
      where: {
        OR: [{ slug: input.promptId }, { id: input.promptId }],
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED"
      },
      select: { id: true, authorId: true, model: true }
    });

    if (!promptRecord) {
      return generateMockResult(prompt, user.creditBalance);
    }

    const generation = await prisma.$transaction(async (tx: any) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { creditBalance: { decrement: prompt.cost } },
        select: { creditBalance: true }
      });

      const createdGeneration = await tx.imageGeneration.create({
        data: {
          userId: user.id,
          promptId: promptRecord.id,
          status: "PROCESSING",
          costCredits: prompt.cost,
          provider: "openai",
          providerModel: process.env.OPENAI_IMAGE_MODEL ?? prompt.model,
          startedAt: new Date(),
          requestPayload: {
            prompt: prompt.prompt,
            negativePrompt: prompt.negativePrompt,
            ratio: prompt.ratio
          }
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          generationId: createdGeneration.id,
          type: "GENERATION_DEBIT",
          amount: -prompt.cost,
          balanceAfter: updatedUser.creditBalance,
          note: `生成同款：${prompt.title}`,
          metadata: { promptId: promptRecord.id }
        }
      });

      return {
        id: createdGeneration.id,
        balanceAfter: updatedUser.creditBalance
      };
    });

    try {
      const providerResult = await generatePromptImage({ prompt });
      const resultAsset = providerResult.asset
        ? await prisma.asset.create({
            data: {
              kind: "GENERATED_IMAGE",
              provider: providerResult.asset.provider,
              objectKey: providerResult.asset.objectKey,
              publicUrl: providerResult.asset.publicUrl,
              mimeType: providerResult.asset.mimeType,
              sizeBytes: providerResult.asset.sizeBytes,
              checksum: providerResult.asset.checksum
            }
          })
        : null;
      const shareCredits = getCreatorShareCredits(prompt.cost, promptRecord.authorId, user.id);

      await prisma.$transaction(async (tx: any) => {
        await tx.imageGeneration.update({
          where: { id: generation.id },
          data: {
            status: "SUCCEEDED",
            resultAssetId: resultAsset?.id,
            creatorShareCredits: shareCredits,
            provider: providerResult.provider,
            providerModel: providerResult.model,
            providerRequestId: providerResult.requestId,
            requestPayload: providerResult.payload,
            completedAt: new Date()
          }
        });

        await tx.prompt.update({
          where: { id: promptRecord.id },
          data: { usageCount: { increment: 1 } }
        });

        if (promptRecord.authorId && promptRecord.authorId !== user.id && shareCredits > 0) {
          const author = await tx.user.update({
            where: { id: promptRecord.authorId },
            data: { creditBalance: { increment: shareCredits } },
            select: { creditBalance: true }
          });

          await tx.creditTransaction.create({
            data: {
              userId: promptRecord.authorId,
              generationId: generation.id,
              type: "CREATOR_SHARE",
              amount: shareCredits,
              balanceAfter: author.creditBalance,
              note: `作者分成：${prompt.title}`,
              metadata: { promptId: promptRecord.id, userId: user.id }
            }
          });
        }
      });

      return {
        id: generation.id,
        status: "SUCCEEDED",
        costCredits: prompt.cost,
        creatorShareCredits: shareCredits,
        balanceAfter: generation.balanceAfter,
        resultImageUrl: providerResult.imageUrl,
        provider: providerResult.provider,
        providerModel: providerResult.model
      };
    } catch (error) {
      const refundedBalance = await refundGeneration({
        generationId: generation.id,
        userId: user.id,
        amount: prompt.cost,
        promptTitle: prompt.title,
        message: error instanceof Error ? error.message : "Image generation failed"
      });

      return {
        id: generation.id,
        status: "REFUNDED",
        costCredits: prompt.cost,
        creatorShareCredits: 0,
        balanceAfter: refundedBalance,
        provider: "openai",
        providerModel: promptRecord.model,
        errorMessage: error instanceof Error ? error.message : "Image generation failed"
      };
    }
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error;
    }

    return generateMockResult(prompt, 1280);
  }
}

async function refundGeneration(input: {
  generationId: string;
  userId: string;
  amount: number;
  promptTitle: string;
  message: string;
}) {
  return prisma.$transaction(async (tx: any) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: { creditBalance: { increment: input.amount } },
      select: { creditBalance: true }
    });

    await tx.imageGeneration.update({
      where: { id: input.generationId },
      data: {
        status: "REFUNDED",
        errorMessage: input.message,
        completedAt: new Date()
      }
    });

    await tx.creditTransaction.create({
      data: {
        userId: input.userId,
        generationId: input.generationId,
        type: "GENERATION_REFUND",
        amount: input.amount,
        balanceAfter: user.creditBalance,
        note: `生成失败退款：${input.promptTitle}`,
        metadata: { reason: input.message }
      }
    });

    return user.creditBalance;
  });
}

function generateMockResult(prompt: Awaited<ReturnType<typeof getPromptById>>, balance: number) {
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  const balanceAfter = Math.max(0, balance - prompt.cost);

  return {
    id: `mock-generation-${Date.now()}`,
    status: "SUCCEEDED" as const,
    costCredits: prompt.cost,
    creatorShareCredits: Math.floor(prompt.cost * defaultCreatorShareRate),
    balanceAfter,
    resultImageUrl: prompt.image,
    provider: "mock",
    providerModel: prompt.model
  };
}

function getCreatorShareCredits(costCredits: number, authorId: string | null, userId: string) {
  if (!authorId || authorId === userId) return 0;
  return Math.floor(costCredits * defaultCreatorShareRate);
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
