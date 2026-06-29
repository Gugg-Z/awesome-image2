import { z } from "zod";

export const promptSubmissionSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  positivePrompt: z.string().min(10),
  negativePrompt: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1).max(8),
  model: z.string().min(1),
  ratio: z.string().min(1)
});

export const bulkPromptSchema = promptSubmissionSchema.extend({
  costCredits: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  authorId: z.string().optional()
});

export const bulkImportSchema = z.object({
  prompts: z.array(bulkPromptSchema).min(1).max(100)
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional()
});

export function parseTags(input: FormDataEntryValue | null) {
  return String(input ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
