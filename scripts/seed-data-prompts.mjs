import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import { readFileSync, statSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const root = process.cwd();
const cases = JSON.parse(readFileSync(path.join(root, "data", "cases.json"), "utf8"));
const styles = JSON.parse(readFileSync(path.join(root, "data", "style-library.json"), "utf8"));
const categoryLabels = new Map(
  (styles.categories ?? []).map((category) => [
    category.value,
    category.title?.zh ?? category.title?.en ?? category.value
  ])
);

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@pb.me" },
    update: { role: "ADMIN", status: "ACTIVE", passwordHash: hashPassword("Ad123123") },
    create: {
      email: "admin@pb.me",
      name: "PromptBay Admin",
      role: "ADMIN",
      status: "ACTIVE",
      creditBalance: 9999,
      passwordHash: hashPassword("Ad123123")
    }
  });

  let count = 0;

  for (const item of cases.cases ?? []) {
    const imagePath = String(item.image ?? "").replace(/^\/images\//, "");
    const fullImagePath = path.join(root, "data", "images", imagePath);
    const fileStat = statSync(fullImagePath);
    const category = categoryLabels.get(item.category) ?? item.category;
    const tags = unique([category, ...(item.styles ?? []), ...(item.scenes ?? [])]).slice(0, 8);
    const slug = `case-${item.id}-${slugify(item.title)}`;

    const existingAsset = await prisma.asset.findFirst({
      where: {
        provider: "LOCAL",
        objectKey: item.image
      }
    });

    const asset = existingAsset
      ? await prisma.asset.update({
          where: { id: existingAsset.id },
          data: {
            publicUrl: item.image,
            mimeType: mimeTypeFor(fullImagePath),
            sizeBytes: fileStat.size
          }
        })
      : await prisma.asset.create({
          data: {
        kind: "PROMPT_EXAMPLE",
        provider: "LOCAL",
        objectKey: item.image,
        publicUrl: item.image,
        originalName: path.basename(fullImagePath),
        mimeType: mimeTypeFor(fullImagePath),
        sizeBytes: fileStat.size
      }
        });

    const prompt = await prisma.prompt.upsert({
      where: { slug },
      update: {
        title: item.title,
        description: item.promptPreview,
        positivePrompt: item.prompt,
        category,
        tags,
        usageCount: item.featured ? 900 + count : Math.max(80, 520 - count),
        likeCount: item.featured ? 260 + (count % 70) : 40 + (count % 180)
      },
      create: {
        slug,
        title: item.title,
        description: item.promptPreview,
        positivePrompt: item.prompt,
        category,
        tags,
        model: "gpt-image-2",
        ratio: "auto",
        costCredits: 10,
        source: "DEVELOPER_UPLOAD",
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED",
        authorId: admin.id,
        reviewerId: admin.id,
        reviewedAt: new Date(),
        usageCount: item.featured ? 900 + count : Math.max(80, 520 - count),
        likeCount: item.featured ? 260 + (count % 70) : 40 + (count % 180)
      }
    });

    const existingPromptImage = await prisma.promptImage.findFirst({
      where: {
        promptId: prompt.id,
        assetId: asset.id
      }
    });

    if (existingPromptImage) {
      await prisma.promptImage.update({
        where: { id: existingPromptImage.id },
        data: { isPrimary: true, sortOrder: 0 }
      });
    } else {
      await prisma.promptImage.create({
        data: {
          promptId: prompt.id,
          assetId: asset.id,
          isPrimary: true,
          sortOrder: 0
        }
      });
    }

    count += 1;
  }

  console.log(`Seeded ${count} prompts from data/cases.json`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
