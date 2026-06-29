import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const filePath = storage.resolvePath(objectKey);
    const [file, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentTypeFor(objectKey)
      }
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

function contentTypeFor(objectKey: string) {
  const lowerKey = objectKey.toLowerCase();
  if (lowerKey.endsWith(".png")) return "image/png";
  if (lowerKey.endsWith(".webp")) return "image/webp";
  if (lowerKey.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}
