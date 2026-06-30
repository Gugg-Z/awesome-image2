import "./load-env.mjs";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@pb.me").toLowerCase().trim();
const adminPassword = process.env.ADMIN_PASSWORD ?? "Ad123123";
const adminName = process.env.ADMIN_NAME ?? "PromptBay Admin";
const adminCredits = Number.parseInt(process.env.ADMIN_CREDITS ?? "9999", 10);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);

  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL must not be empty.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD must be set before production startup.");
  }

  if (adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  if (process.env.NODE_ENV === "production" && adminPassword.includes("replace-with")) {
    throw new Error("ADMIN_PASSWORD must be changed before production startup.");
  }

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: hashPassword(adminPassword)
    },
    create: {
      email: adminEmail,
      name: adminName,
      role: "ADMIN",
      status: "ACTIVE",
      creditBalance: Number.isFinite(adminCredits) ? adminCredits : 9999,
      passwordHash: hashPassword(adminPassword)
    }
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
