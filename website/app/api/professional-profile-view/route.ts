import { createClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "@/lib/supabase-projects";
import { siteConfig } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === siteConfig.url) return true;

  return process.env.NODE_ENV !== "production"
    && (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000");
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "This request could not be verified." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 1_024) {
    return Response.json({ error: "The request was too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The profile could not be identified." }, { status: 400 });
  }

  const professionalId = typeof payload === "object" && payload !== null
    ? (payload as { professionalId?: unknown }).professionalId
    : null;
  if (typeof professionalId !== "string" || !UUID_PATTERN.test(professionalId)) {
    return Response.json({ error: "The profile could not be identified." }, { status: 400 });
  }

  const config = getSecondarySupabaseServerConfig();
  if (!config.url || !config.serviceRoleKey) {
    return Response.json({ error: "Profile view tracking is unavailable." }, { status: 503 });
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.rpc("record_public_professional_profile_view", {
    p_trainer_profile_id: professionalId,
  });

  if (error) {
    console.error("Professional profile view tracking failed.", { code: error.code });
    return Response.json({ error: "Profile view tracking is unavailable." }, { status: 503 });
  }

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
