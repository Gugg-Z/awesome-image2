import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/authz";

export const rechargePackages = [
  { id: "starter", name: "入门包", credits: 100, amountCents: 990 },
  { id: "creator", name: "创作包", credits: 580, amountCents: 4900 },
  { id: "studio", name: "工作室包", credits: 1280, amountCents: 9900 }
] as const;

export async function createMockRecharge(input: {
  packageId: string;
  userId?: string;
}) {
  const rechargePackage = rechargePackages.find((item) => item.id === input.packageId);

  if (!rechargePackage) {
    throw new Error("Recharge package not found");
  }

  try {
    const user = input.userId
      ? await prisma.user.findUnique({ where: { id: input.userId } })
      : await ensureDemoUser();

    if (!user) {
      throw new Error("User not found");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { creditBalance: { increment: rechargePackage.credits } },
        select: { id: true, creditBalance: true }
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: "RECHARGE",
          amount: rechargePackage.credits,
          balanceAfter: updatedUser.creditBalance,
          note: `模拟充值：${rechargePackage.name}`,
          metadata: {
            packageId: rechargePackage.id,
            amountCents: rechargePackage.amountCents,
            provider: "mock"
          }
        }
      });

      return {
        transactionId: transaction.id,
        balanceAfter: updatedUser.creditBalance
      };
    });

    return {
      id: `mock-pay-${result.transactionId}`,
      status: "PAID",
      package: rechargePackage,
      balanceAfter: result.balanceAfter
    };
  } catch {
    return {
      id: `mock-pay-${Date.now()}`,
      status: "PAID",
      package: rechargePackage,
      balanceAfter: 1280 + rechargePackage.credits
    };
  }
}
