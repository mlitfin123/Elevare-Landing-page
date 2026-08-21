import fs from "node:fs";
import path from "node:path";
import { buildLegacyRedirects } from "../lib/legacy-routes.ts";

const outputPath = path.join(process.cwd(), "config", "redirects.json");
const redirects = buildLegacyRedirects();
const serialized = `${JSON.stringify(redirects, null, 2)}\n`;
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

  if (existing !== serialized) {
    throw new Error("Vercel redirect artifact is stale. Run `npm run routes:generate` and commit config/redirects.json.");
  }

  console.log(`Verified ${redirects.length} generated Vercel redirects.`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated ${redirects.length} Vercel redirects at config/redirects.json.`);
}
