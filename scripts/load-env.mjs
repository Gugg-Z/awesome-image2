import { existsSync, readFileSync } from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");

function parseValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === `"` || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();

    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = parseValue(trimmed.slice(separator + 1));
  }
}
