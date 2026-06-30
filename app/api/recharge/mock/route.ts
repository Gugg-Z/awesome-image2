import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { createMockRecharge } from "@/lib/recharge-service";

const rechargeSchema = z.object({
  packageId: z.string().min(1)
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  if (!auth.context.userId || auth.context.role === "USER") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = rechargeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid recharge payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const recharge = await createMockRecharge({
      packageId: parsed.data.packageId,
      userId: auth.context.userId
    });

    return NextResponse.json({ recharge }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recharge failed" },
      { status: 400 }
    );
  }
}
