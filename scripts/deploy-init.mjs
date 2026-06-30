import "./load-env.mjs";
import { spawn } from "child_process";

const isWindows = process.platform === "win32";
const docker = isWindows ? "docker.exe" : "docker";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForPostgres() {
  const maxAttempts = Number.parseInt(process.env.POSTGRES_READY_ATTEMPTS ?? "30", 10);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await run(docker, ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "promptbay", "-d", "promptbay"]);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.log(`PostgreSQL is not ready yet (${attempt}/${maxAttempts}); waiting...`);
      await delay(2000);
    }
  }
}

async function main() {
  console.log("Starting PostgreSQL container...");
  await run(docker, ["compose", "up", "-d", "postgres"]);

  console.log("Waiting for PostgreSQL...");
  await waitForPostgres();

  console.log("Generating Prisma client...");
  await run(pnpm, ["db:generate"]);

  console.log("Creating or updating database tables...");
  await run(pnpm, ["db:push"]);

  console.log("Creating admin user...");
  await run(pnpm, ["seed:admin"]);

  console.log("Deployment initialization complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
