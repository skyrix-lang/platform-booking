import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPlatforms() {
  const configPath = resolve(
    __dirname,
    "../../../frontend/src/config/platforms.json",
  );
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw).platforms as { id: string; name: string }[];
}

export const platforms = new Hono();

platforms.get("/", (c) => {
  const list = loadPlatforms();
  return c.json(list);
});
