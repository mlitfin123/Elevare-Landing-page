import { readBoundedJson, parseProfessionalEvent, validRevalidationSecret } from "@/lib/professional-request";
import { revalidateProfessional } from "@/lib/professional-revalidation";
import { getMarketplaceServerClient } from "@/lib/marketplace-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.PROFESSIONAL_REVALIDATION_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: "unavailable" }, { status: 503 });
  if (!validRevalidationSecret(request.headers.get("authorization"), secret)) return Response.json({ error: "unauthorized" }, { status: 401 });
  let event;
  try { event = parseProfessionalEvent(await readBoundedJson(request)); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  try {
    const budget = await getMarketplaceServerClient().rpc("marketplace_publication_delivery_allowed");
    if (budget.error) throw new Error("RATE_LIMIT_UNAVAILABLE");
    if (budget.data !== true) return Response.json({ error: "retry_later" }, { status: 429, headers: { "retry-after": "60" } });
    return Response.json(await revalidateProfessional(event.professionalId), { headers: { "cache-control": "no-store" } });
  } catch {
    console.error(JSON.stringify({ event: "professional_public_revalidation_failed", category: "retryable" }));
    return Response.json({ error: "retry_later" }, { status: 503, headers: { "retry-after": "30" } });
  }
}
