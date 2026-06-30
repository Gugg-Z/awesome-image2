import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().trim().max(32, "昵称最多 32 个字符").optional(),
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最多 72 位")
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid register payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
  }

  const userCount = await prisma.user.count();
  const displayName = parsed.data.name || `用户${String(userCount + 1).padStart(4, "0")}`;

  const user = await prisma.user.create({
    data: {
      name: displayName,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "USER",
      status: "ACTIVE",
      creditBalance: 0
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  return NextResponse.json({ user }, { status: 201 });
}
