import fs from "node:fs";
import path from "node:path";
import { buildLegacyRedirects } from "../lib/legacy-routes.ts";

const outputPath = path.join(process.cwd(), "config", "redirects.json");
const vercelConfigPath = path.join(process.cwd(), "vercel.json");
const redirects = buildLegacyRedirects();
const serialized = `${JSON.stringify(redirects, null, 2)}\n`;
const checkOnly = process.argv.includes("--check");
const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8")) as {
  bulkRedirectsPath?: string;
  redirects?: Array<{
    source: string;
    destination: string;
    permanent?: boolean;
    has?: Array<{ type: string; key?: string; value?: string }>;
  }>;
  [key: string]: unknown;
};
const conditionalRedirects = (vercelConfig.redirects ?? []).filter((redirect) => redirect.has?.length);
const embeddedLegacyRedirects = (vercelConfig.redirects ?? []).filter((redirect) => !redirect.has?.length);

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

  if (existing !== serialized) {
    throw new Error("Vercel redirect artifact is stale. Run `npm run routes:generate` and commit config/redirects.json.");
  }

  if (vercelConfig.bulkRedirectsPath !== undefined) {
    throw new Error("bulkRedirectsPath is not supported by the Vercel Hobby plan. Run `npm run routes:generate`.");
  }

  if (JSON.stringify(embeddedLegacyRedirects) !== JSON.stringify(redirects)) {
    throw new Error("Embedded Vercel redirects are stale. Run `npm run routes:generate` and commit vercel.json.");
  }

  console.log(`Verified ${redirects.length} generated Vercel redirects in the artifact and vercel.json.`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);

  delete vercelConfig.bulkRedirectsPath;
  vercelConfig.redirects = [...conditionalRedirects, ...redirects];
  fs.writeFileSync(vercelConfigPath, `${JSON.stringify(vercelConfig, null, 2)}\n`);

  console.log(`Generated ${redirects.length} Vercel redirects in config/redirects.json and vercel.json.`);
}
