import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

// The repository's .env. Paths are relative: run drizzle-kit from this folder
// (the root db:* scripts do).
const envFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

// drizzle-kit only prints "Invalid URL" for a URL it can't read, such as one
// whose password has a "/" in it (openssl rand -base64 makes those).
const url = process.env.DATABASE_URL;
if (!url || !URL.canParse(url)) {
  throw new Error(
    "DATABASE_URL is missing or isn't a valid URL. A password in it must be URL-safe: use letters and digits, such as `openssl rand -hex 24`.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
