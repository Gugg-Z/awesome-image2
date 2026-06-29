import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const imageRoot = path.join(process.cwd(), "data", "images");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: imagePath } = await params;
  const relativePath = imagePath.join("/");
  const filePath = path.resolve(imageRoot, relativePath);

  if (!filePath.startsWith(path.resolve(imageRoot))) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  }

  try {
    const [file, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    const contentType = contentTypeFor(filePath);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType
      }
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}
