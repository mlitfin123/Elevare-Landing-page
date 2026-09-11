import { getMarketplaceServerClient } from "@/lib/marketplace-server";
import { readBoundedJson } from "@/lib/professional-request";
import { tryRevalidateProfessional } from "@/lib/professional-revalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  let payload: Record<string, unknown>;
  try { payload = await readBoundedJson(request, 131072) as Record<string, unknown>; }
  catch { return Response.json({ error: "invalid_request" }, { status: 400 }); }
  if (!payload || !["availability", "confirmation", "retry", "profile"].includes(String(payload.action))) return Response.json({ error: "invalid_request" }, { status: 400 });
  try {
    // Supabase verifies this token and all mutations execute as the professional,
    // preserving database review guards and RLS. No privileged write client.
    const client = getMarketplaceServerClient(token);
    const { data: ownerId, error: ownerError } = await client.rpc("marketplace_current_user_id");
    if (ownerError || !ownerId) return Response.json({ error: "unauthorized" }, { status: 401 });
    let record: unknown = null;
    if (payload.action !== "retry") {
      const rpc = payload.action === "availability" ? "marketplace_update_professional_availability"
        : payload.action === "confirmation" ? "marketplace_confirm_professional_profile" : "marketplace_save_professional_profile";
      const args = payload.action === "profile" ? { p_expected_updated_at: payload.version ?? null, p_payload: payload.profile }
        : { p_expected_updated_at: payload.version ?? null, ...(payload.action === "availability" ? { p_status: payload.status } : {}) };
      const result = await client.rpc(rpc, args);
      if (result.error) {
        const conflict = result.error.code === "40001" || /changed in another session/.test(result.error.message);
        return Response.json({ error: conflict ? "conflict" : "save_failed" }, { status: conflict ? 409 : 422 });
      }
      record = result.data;
    }
    const { data: profile, error } = await client.from("trainer_profiles").select("id").eq("user_id", ownerId).single();
    // A committed save is never reported as a failed write if propagation fails.
    const propagation = error || !profile ? "delayed" : await tryRevalidateProfessional(profile.id);
    return Response.json({ record, propagation }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
