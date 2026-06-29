import { NextResponse } from "next/server";
import { z } from "zod";
import { adjustUserCredits } from "@/lib/admin-service";
import { requireAdmin } from "@/lib/authz";

const creditAdjustmentSchema = z.object({
  amount: z.number().int().min(-100000).max(100000).refine((value) => value !== 0, "Amount cannot be zero"),
  note: z.string().max(200).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = creditAdjustmentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credit adjustment", issues: parsed.error.flatten() }, { status: 400 });
  }

  const user = await adjustUserCredits({
    userId: id,
    amount: parsed.data.amount,
    note: parsed.data.note
  });

  return NextResponse.json({ user });
}
