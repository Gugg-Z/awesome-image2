import { storage } from "@/lib/storage";
import type { PromptItem } from "@/lib/mock-data";

export type ImageGenerationProviderInput = {
  prompt: PromptItem;
  promptText?: string;
  size?: string;
};

export type ImageGenerationProviderResult = {
  provider: "image-api" | "openai" | "mock";
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
  timing?: Record<string, unknown>;
};

type OpenAIImageResponse = {
  id?: string;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

type ParsedImageApiResult = {
  requestId?: string;
  imageUrl?: string;
  b64Json?: string;
  mimeType?: string;
};

export async function generatePromptImage(
  input: ImageGenerationProviderInput
): Promise<ImageGenerationProviderResult> {
  if (process.env.IMAGE_BASE_URL && process.env.IMAGE_API_KEY) {
    return await generateWithImageApi(input.prompt, input);
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockImageGeneration(input.prompt, undefined, input);
  }

  try {
    return await generateWithOpenAI(input.prompt, input);
  } catch (error) {
    if (process.env.IMAGE_GENERATION_STRICT === "true") {
      throw error;
    }

    return mockImageGeneration(input.prompt, error, input);
  }
}

async function generateWithImageApi(prompt: PromptItem, input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
  const model = process.env.OPENAI_IMAGE_MODEL ?? prompt.model ?? "image-api";
  const endpoint = imageApiEndpoint(process.env.IMAGE_BASE_URL!);
  const requestStartedAt = new Date();
  const startedMs = Date.now();
  const payload = {
    model,
    prompt: buildPromptText(prompt, input.promptText),
    negativePrompt: prompt.negativePrompt || undefined,
    ratio: prompt.ratio,
    size: input.size ?? sizeForRatio(prompt.ratio),
    quality: "standard",
    speed: "fast",
    n: 1
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(imageRequestTimeoutMs())
  });

  const responseMs = Date.now();
  const responseText = await response.text();
  const bodyReadMs = Date.now();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(`Image API generation failed: ${response.status} ${responseText}`);
  }

  if (!contentType.includes("application/json") && looksLikeHtml(responseText)) {
    throw new Error("Image API returned HTML instead of JSON. Please set IMAGE_BASE_URL to the image generation API endpoint, not the website homepage.");
  }

  const data = parseJsonResponse(responseText);
  const parsed = parseImageApiResult(data);
  const parsedMs = Date.now();
  const timing = {
    endpoint,
    requestStartedAt: requestStartedAt.toISOString(),
    responseReceivedAt: new Date(responseMs).toISOString(),
    bodyReadAt: new Date(bodyReadMs).toISOString(),
    parsedAt: new Date(parsedMs).toISOString(),
    fetchMs: responseMs - startedMs,
    bodyReadMs: bodyReadMs - responseMs,
    parseMs: parsedMs - bodyReadMs,
    totalProviderMs: parsedMs - startedMs,
    responseStatus: response.status,
    responseBytes: responseText.length
  };

  console.info("Image API timing", timing);

  if (parsed.b64Json) {
    const assetStartedMs = Date.now();
    const buffer = Buffer.from(parsed.b64Json, "base64");
    const mimeType = parsed.mimeType ?? "image/png";
    const extension = extensionForMimeType(mimeType);
    const asset = await storage.put({
      buffer,
      mimeType,
      extension,
      folder: "generated"
    });

    return {
      provider: "image-api",
      model,
      requestId: parsed.requestId,
      imageUrl: asset.publicUrl,
      asset,
      payload,
      timing: {
        ...timing,
        assetStoreMs: Date.now() - assetStartedMs
      }
    };
  }

  if (parsed.imageUrl) {
    const remoteAsset = await storeRemoteImage(parsed.imageUrl);

    if (remoteAsset) {
      return {
        provider: "image-api",
        model,
        requestId: parsed.requestId,
        imageUrl: remoteAsset.publicUrl,
        asset: remoteAsset,
        payload,
        timing
      };
    }

    return {
      provider: "image-api",
      model,
      requestId: parsed.requestId,
      imageUrl: parsed.imageUrl,
      payload,
      timing
    };
  }

  throw new Error("Image API generation returned no image");
}

async function storeRemoteImage(imageUrl: string) {
  if (!/^https?:\/\//i.test(imageUrl)) return null;

  try {
    const startedMs = Date.now();
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(imageRequestTimeoutMs())
    });

    if (!response.ok) {
      console.warn("Generated image download failed", {
        imageUrl,
        status: response.status
      });
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const asset = await storage.put({
      buffer,
      mimeType: contentType,
      extension: extensionForMimeType(contentType),
      folder: "generated"
    });

    console.info("Generated image stored locally", {
      imageUrl,
      objectKey: asset.objectKey,
      elapsedMs: Date.now() - startedMs
    });

    return asset;
  } catch (error) {
    console.warn("Generated image download failed", error);
    return null;
  }
}

async function generateWithOpenAI(prompt: PromptItem, input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
  const model = process.env.OPENAI_IMAGE_MODEL ?? prompt.model ?? "gpt-image-2";
  const payload = {
    model,
    prompt: buildPromptText(prompt, input.promptText),
    size: input.size ?? sizeForRatio(prompt.ratio)
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

function imageApiEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("IMAGE_BASE_URL is empty");
  }

  if (/\/images\/generations$/i.test(normalized)) return normalized;
  if (/\/v1$/i.test(normalized)) return `${normalized}/images/generations`;
  if (!/\/v\d+(\/|$)/i.test(new URL(normalized).pathname)) return `${normalized}/v1/images/generations`;

  return normalized;
}

function imageRequestTimeoutMs() {
  const value = Number(process.env.IMAGE_REQUEST_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 300_000;
}

function parseJsonResponse(responseText: string): unknown {
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Image API returned invalid JSON: ${responseText.slice(0, 160)}`);
  }
}

function looksLikeHtml(responseText: string) {
  const trimmed = responseText.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

function parseImageApiResult(data: unknown): ParsedImageApiResult {
  if (!isRecord(data)) return {};

  const firstDataItem = Array.isArray(data.data) ? data.data[0] : data.data;
  const firstImageItem = Array.isArray(data.images) ? data.images[0] : data.images;
  const firstOutputItem = Array.isArray(data.output) ? data.output[0] : data.output;
  const candidates = [data, firstDataItem, firstImageItem, firstOutputItem, data.result, data.image].filter(isRecord);
  const stringCandidates = [firstDataItem, firstImageItem, firstOutputItem, data.url, data.imageUrl, data.outputUrl, data.resultUrl].filter(
    (item): item is string => typeof item === "string"
  );

  for (const candidate of candidates) {
    const imageUrl = stringValue(candidate.url) ?? stringValue(candidate.imageUrl) ?? stringValue(candidate.outputUrl) ?? stringValue(candidate.resultUrl);
    const b64Json = stringValue(candidate.b64_json) ?? stringValue(candidate.b64Json) ?? stringValue(candidate.base64) ?? dataUrlToBase64(imageUrl);

    if (imageUrl && !imageUrl.startsWith("data:")) {
      return {
        requestId: stringValue(data.id) ?? stringValue(data.requestId) ?? stringValue(candidate.id),
        imageUrl,
        mimeType: stringValue(candidate.mimeType)
      };
    }

    if (b64Json) {
      return {
        requestId: stringValue(data.id) ?? stringValue(data.requestId) ?? stringValue(candidate.id),
        b64Json,
        mimeType: stringValue(candidate.mimeType) ?? dataUrlMimeType(imageUrl)
      };
    }
  }

  for (const value of stringCandidates) {
    if (value.startsWith("data:")) {
      return {
        requestId: stringValue(data.id) ?? stringValue(data.requestId),
        b64Json: dataUrlToBase64(value),
        mimeType: dataUrlMimeType(value)
      };
    }

    return {
      requestId: stringValue(data.id) ?? stringValue(data.requestId),
      imageUrl: value
    };
  }

  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function dataUrlToBase64(value?: string) {
  if (!value?.startsWith("data:")) return undefined;
  return value.split(",", 2)[1];
}

function dataUrlMimeType(value?: string) {
  if (!value?.startsWith("data:")) return undefined;
  const match = value.match(/^data:([^;,]+)/);
  return match?.[1];
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

function mockImageGeneration(prompt: PromptItem, error?: unknown, input?: ImageGenerationProviderInput): ImageGenerationProviderResult {
  const model = process.env.OPENAI_IMAGE_MODEL ?? prompt.model ?? "mock-image";

  return {
    provider: "mock",
    model,
    imageUrl: prompt.image,
    payload: {
      model,
      prompt: buildPromptText(prompt, input?.promptText),
      size: input?.size ?? sizeForRatio(prompt.ratio),
      simulated: true,
      fallbackReason: error instanceof Error ? error.message : undefined
    }
  };
}

function buildPromptText(prompt: PromptItem, promptText?: string) {
  if (promptText?.trim()) return promptText.trim();
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
