import { readFileSync } from "node:fs";
import path from "node:path";
import { STAGELAB_LEGAL_ROUTES } from "@/lib/legal-routes";

export const dynamic = "force-static";

export function GET() {
  const html = readFileSync(path.join(process.cwd(), "public", STAGELAB_LEGAL_ROUTES.coach.sourceFile), "utf8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
