import { storage } from "@/lib/storage";
import type { PromptItem } from "@/lib/mock-data";

export type ImageGenerationProviderInput = {
  prompt: PromptItem;
};

export type ImageGenerationProviderResult = {
  provider: "openai" | "mock";
  model: string;
  requestId?: string;
  imageUrl: string;
  asset?: {
    provider: "LOCAL";
    objectKey: string;
    publicUrl: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
  };
  payload: Record<string, unknown>;
};

type OpenAIImageResponse = {
  id?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

export async function generatePromptImage(
  input: ImageGenerationProviderInput
): Promise<ImageGenerationProviderResult> {
  if (!process.env.OPENAI_API_KEY) {
    return mockImageGeneration(input.prompt);
  }

  try {
    return await generateWithOpenAI(input.prompt);
  } catch (error) {
    if (process.env.IMAGE_GENERATION_STRICT === "true") {
      throw error;
    }

    return mockImageGeneration(input.prompt, error);
  }
}

async function generateWithOpenAI(prompt: PromptItem): Promise<ImageGenerationProviderResult> {
  const model = process.env.OPENAI_IMAGE_MODEL ?? prompt.model ?? "gpt-image-2";
  const payload = {
    model,
    prompt: buildPromptText(prompt),
    size: sizeForRatio(prompt.ratio)
  };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as OpenAIImageResponse;
  const firstImage = data.data?.[0];

  if (firstImage?.b64_json) {
    const buffer = Buffer.from(firstImage.b64_json, "base64");
    const asset = await storage.put({
      buffer,
      mimeType: "image/png",
      extension: ".png",
      folder: "generated"
    });

    return {
      provider: "openai",
      model,
      requestId: data.id,
      imageUrl: asset.publicUrl,
      asset,
      payload
    };
  }

  if (firstImage?.url) {
    return {
      provider: "openai",
      model,
      requestId: data.id,
      imageUrl: firstImage.url,
      payload
    };
  }

  throw new Error("OpenAI image generation returned no image");
}

function mockImageGeneration(prompt: PromptItem, error?: unknown): ImageGenerationProviderResult {
  const model = process.env.OPENAI_IMAGE_MODEL ?? prompt.model ?? "mock-image";

  return {
    provider: "mock",
    model,
    imageUrl: prompt.image,
    payload: {
      model,
      prompt: buildPromptText(prompt),
      simulated: true,
      fallbackReason: error instanceof Error ? error.message : undefined
    }
  };
}

function buildPromptText(prompt: PromptItem) {
  if (!prompt.negativePrompt) return prompt.prompt;
  return `${prompt.prompt}\n\nNegative prompt: ${prompt.negativePrompt}`;
}

function sizeForRatio(ratio: string) {
  if (ratio === "16:9") return "1536x864";
  if (ratio === "9:16") return "864x1536";
  if (ratio === "4:5") return "1024x1280";
  if (ratio === "3:4") return "960x1280";
  if (ratio === "2:3") return "1024x1536";
  if (ratio === "1:1") return "1024x1024";
  return "1024x1024";
}
