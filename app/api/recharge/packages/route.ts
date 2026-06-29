import { NextResponse } from "next/server";
import { rechargePackages } from "@/lib/recharge-service";

export async function GET() {
  return NextResponse.json({ packages: rechargePackages });
}
