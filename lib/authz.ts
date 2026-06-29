import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthContext = {
  userId?: string;
  role: "USER" | "DEVELOPER" | "ADMIN";
  isDemo: boolean;
};

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      role: session.user.role ?? "USER",
      isDemo: false
    };
  }

  return {
    role: process.env.AUTH_REQUIRED === "true" ? "USER" : "ADMIN",
    isDemo: true
  };
}

export async function requireUser() {
  const context = await getAuthContext();

  if (process.env.AUTH_REQUIRED === "true" && !context.userId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    };
  }

  return { ok: true as const, context };
}

export async function requireAdmin() {
  const context = await getAuthContext();

  if (process.env.AUTH_REQUIRED === "true" && (!context.userId || context.role !== "ADMIN")) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "FORBIDDEN" }, { status: context.userId ? 403 : 401 })
    };
  }

  return { ok: true as const, context };
}

export async function ensureDemoAdminUser() {
  return prisma.user.upsert({
    where: { email: "admin@promptbay.local" },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      email: "admin@promptbay.local",
      name: "PromptBay Admin",
      role: "ADMIN",
      status: "ACTIVE",
      creditBalance: 9999
    }
  });
}

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@promptbay.local" },
    update: { status: "ACTIVE" },
    create: {
      email: "demo@promptbay.local",
      name: "设计师 Demo",
      status: "ACTIVE",
      creditBalance: 1280
    }
  });
}
