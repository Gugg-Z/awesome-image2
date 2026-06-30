import { prisma } from "@/lib/prisma";
import { getPromptById } from "@/lib/prompt-service";
import { generatePromptImage } from "@/lib/image-provider";

const defaultCreatorShareRate = 0.2;
const terminalStatuses = new Set(["SUCCEEDED", "FAILED", "REFUNDED"]);

export type GenerateFromPromptResult = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
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

export class MissingUserError extends Error {
  constructor() {
    super("Login required");
  }
}

export async function createImageGenerationJob(input: {
  promptId: string;
  userId?: string;
  promptText?: string;
  size?: string;
}): Promise<GenerateFromPromptResult> {
  const prompt = await getPromptById(input.promptId);

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  if (!input.userId) {
    throw new MissingUserError();
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });

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

    const generation = await prisma.imageGeneration.create({
      data: {
        userId: user.id,
        promptId: promptRecord.id,
        status: "PROCESSING",
        costCredits: prompt.cost,
        provider: process.env.IMAGE_BASE_URL && process.env.IMAGE_API_KEY ? "image-api" : "openai",
        providerModel: process.env.OPENAI_IMAGE_MODEL ?? prompt.model,
        startedAt: new Date(),
        requestPayload: {
          prompt: prompt.prompt,
          promptOverride: input.promptText,
          negativePrompt: prompt.negativePrompt,
          ratio: prompt.ratio,
          size: input.size
        }
      }
    });

    const result: GenerateFromPromptResult = {
      id: generation.id,
      status: "PROCESSING",
      costCredits: prompt.cost,
      creatorShareCredits: 0,
      balanceAfter: user.creditBalance,
      provider: generation.provider,
      providerModel: generation.providerModel
    };

    const completionInput = {
      generationId: generation.id,
      promptId: input.promptId,
      userId: user.id,
      promptText: input.promptText,
      size: input.size
    };

    if (process.env.IMAGE_GENERATION_ASYNC !== "true") {
      await completeImageGenerationJob(completionInput);
      return (await getImageGenerationForUser({ generationId: generation.id, userId: user.id })) ?? result;
    }

    queueGenerationCompletion(completionInput);

    return result;
  } catch (error) {
    if (error instanceof InsufficientCreditsError || error instanceof MissingUserError) {
      throw error;
    }

    return generateMockResult(prompt, 1280);
  }
}

export async function completeImageGenerationJob(input: {
  generationId: string;
  promptId: string;
  userId: string;
  promptText?: string;
  size?: string;
}) {
  const prompt = await getPromptById(input.promptId);

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  const generation = await prisma.imageGeneration.findUnique({
    where: { id: input.generationId },
    select: {
      id: true,
      userId: true,
      status: true,
      costCredits: true,
      prompt: { select: { id: true, authorId: true, model: true } }
    }
  });

  if (!generation || generation.userId !== input.userId || terminalStatuses.has(generation.status)) {
    return;
  }

  try {
    const providerStartedMs = Date.now();
    const providerResult = await generatePromptImage({
      prompt,
      promptText: input.promptText,
      size: input.size
    });
    const providerFinishedMs = Date.now();
    const assetStartedMs = Date.now();
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
      : await prisma.asset.create({
          data: {
            kind: "GENERATED_IMAGE",
            provider: "LOCAL",
            objectKey: providerResult.imageUrl,
            publicUrl: providerResult.imageUrl,
            mimeType: "image/png",
            sizeBytes: 0
          }
        });
    const assetFinishedMs = Date.now();
    const shareCredits = getCreatorShareCredits(generation.costCredits, generation.prompt.authorId, input.userId);
    const dbUpdateStartedMs = Date.now();

    await prisma.$transaction(async (tx: any) => {
      const chargeUser = await tx.user.findUnique({
        where: { id: input.userId },
        select: { creditBalance: true }
      });

      if (!chargeUser) {
        throw new Error("User not found");
      }

      if (chargeUser.creditBalance < generation.costCredits) {
        await tx.imageGeneration.update({
          where: { id: generation.id },
          data: {
            status: "FAILED",
            errorCode: "INSUFFICIENT_CREDITS",
            errorMessage: "Insufficient credits when charging after generation",
            completedAt: new Date()
          }
        });

        throw new InsufficientCreditsError(chargeUser.creditBalance, generation.costCredits);
      }

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: { creditBalance: { decrement: generation.costCredits } },
        select: { creditBalance: true }
      });

      await tx.imageGeneration.update({
        where: { id: generation.id },
        data: {
          status: "SUCCEEDED",
          resultAssetId: resultAsset.id,
          creatorShareCredits: shareCredits,
          provider: providerResult.provider,
          providerModel: providerResult.model,
          providerRequestId: providerResult.requestId,
          requestPayload: {
            ...providerResult.payload,
            _timing: {
              ...(providerResult.timing ?? {}),
              providerCallMs: providerFinishedMs - providerStartedMs,
              assetPersistMs: assetFinishedMs - assetStartedMs,
              dbUpdateStartedAt: new Date(dbUpdateStartedMs).toISOString()
            }
          },
          completedAt: new Date()
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId: input.userId,
          generationId: generation.id,
          type: "GENERATION_DEBIT",
          amount: -generation.costCredits,
          balanceAfter: updatedUser.creditBalance,
          note: `生成同款：${prompt.title}`,
          metadata: { promptId: generation.prompt.id }
        }
      });

      await tx.prompt.update({
        where: { id: generation.prompt.id },
        data: { usageCount: { increment: 1 } }
      });

      if (generation.prompt.authorId && generation.prompt.authorId !== input.userId && shareCredits > 0) {
        const author = await tx.user.update({
          where: { id: generation.prompt.authorId },
          data: { creditBalance: { increment: shareCredits } },
          select: { creditBalance: true }
        });

        await tx.creditTransaction.create({
          data: {
            userId: generation.prompt.authorId,
            generationId: generation.id,
            type: "CREATOR_SHARE",
            amount: shareCredits,
            balanceAfter: author.creditBalance,
            note: `作者分成：${prompt.title}`,
            metadata: { promptId: generation.prompt.id, userId: input.userId }
          }
        });
      }
    });

    console.info("Image generation job timing", {
      generationId: generation.id,
      providerCallMs: providerFinishedMs - providerStartedMs,
      assetPersistMs: assetFinishedMs - assetStartedMs,
      dbUpdateMs: Date.now() - dbUpdateStartedMs
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error;
    }

    await failGeneration({
      generationId: generation.id,
      message: error instanceof Error ? error.message : "Image generation failed"
    });
  }
}

export async function getImageGenerationForUser(input: {
  generationId: string;
  userId?: string;
}): Promise<GenerateFromPromptResult | null> {
  if (!input.userId) return null;

  const generation = await prisma.imageGeneration.findFirst({
    where: {
      id: input.generationId,
      userId: input.userId
    },
    include: {
      resultAsset: { select: { publicUrl: true } },
      user: { select: { creditBalance: true } }
    }
  });

  if (!generation) return null;

  return {
    id: generation.id,
    status: generation.status as GenerateFromPromptResult["status"],
    costCredits: generation.costCredits,
    creatorShareCredits: generation.creatorShareCredits,
    balanceAfter: generation.user.creditBalance,
    resultImageUrl: generation.resultAsset?.publicUrl ?? undefined,
    provider: generation.provider,
    providerModel: generation.providerModel,
    errorMessage: generation.errorMessage ?? undefined
  };
}

async function failGeneration(input: {
  generationId: string;
  message: string;
}) {
  await prisma.imageGeneration.update({
    where: { id: input.generationId },
    data: {
      status: "FAILED",
      errorMessage: input.message,
      completedAt: new Date()
    }
  });
}

function queueGenerationCompletion(input: {
  generationId: string;
  promptId: string;
  userId: string;
  promptText?: string;
  size?: string;
}) {
  void completeImageGenerationJob(input).catch((error) => {
    console.error("Background image generation failed", error);
  });
}

function generateMockResult(prompt: Awaited<ReturnType<typeof getPromptById>>, balance: number) {
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  return {
    id: `mock-generation-${Date.now()}`,
    status: "SUCCEEDED" as const,
    costCredits: prompt.cost,
    creatorShareCredits: Math.floor(prompt.cost * defaultCreatorShareRate),
    balanceAfter: balance,
    resultImageUrl: prompt.image,
    provider: "mock",
    providerModel: prompt.model
  };
}

function getCreatorShareCredits(costCredits: number, authorId: string | null, userId: string) {
  if (!authorId || authorId === userId) return 0;
  return Math.floor(costCredits * defaultCreatorShareRate);
}
