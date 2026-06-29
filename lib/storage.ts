import { createHash } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type StoredFile = {
  provider: "LOCAL";
  objectKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
};

export type StorageAdapter = {
  put(input: {
    buffer: Buffer;
    mimeType: string;
    extension?: string;
    folder?: string;
  }): Promise<StoredFile>;
  resolvePath(objectKey: string): string;
};

const defaultStorageRoot = path.join(process.cwd(), "storage", "uploads");

export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root = process.env.LOCAL_STORAGE_ROOT ?? defaultStorageRoot) {
    this.root = root;
  }

  async put(input: {
    buffer: Buffer;
    mimeType: string;
    extension?: string;
    folder?: string;
  }): Promise<StoredFile> {
    const folder = input.folder ?? "general";
    const extension = normalizeExtension(input.extension ?? extensionFromMime(input.mimeType));
    const objectKey = `${folder}/${datePath()}/${randomUUID()}${extension}`;
    const filePath = this.resolvePath(objectKey);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.buffer);

    const fileStat = await stat(filePath);
    const checksum = createHash("sha256").update(input.buffer).digest("hex");

    return {
      provider: "LOCAL",
      objectKey,
      publicUrl: `/api/media/${objectKey.split("/").map(encodeURIComponent).join("/")}`,
      mimeType: input.mimeType,
      sizeBytes: fileStat.size,
      checksum
    };
  }

  resolvePath(objectKey: string) {
    const normalizedKey = objectKey.replaceAll("\\", "/");
    const filePath = path.resolve(this.root, normalizedKey);
    const rootPath = path.resolve(this.root);

    if (!filePath.startsWith(rootPath)) {
      throw new Error("Invalid storage object key");
    }

    return filePath;
  }
}

export const storage = new LocalStorageAdapter();

function datePath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function normalizeExtension(extension: string) {
  if (!extension) return "";
  return extension.startsWith(".") ? extension : `.${extension}`;
}

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}
