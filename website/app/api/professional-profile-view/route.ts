import { createClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "@/lib/supabase-projects";
import { siteConfig } from "@/lib/site";
import { mayRecordAggregateProfileView, normalizeProfileViewChoice } from "@/lib/profile-view-privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISITOR_COOKIE = "elevare_profile_visitor";
const BOT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|whatsapp|linkedinbot/i;

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === siteConfig.url) return true;

  return process.env.NODE_ENV !== "production"
    && (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000");
}

function bearerToken(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

function completedView(recorded = false) {
  return new Response(null, { status: 204, headers: {
    "cache-control": "no-store",
    "x-elevare-profile-view": recorded ? "recorded" : "skipped",
    // Retire the old identifier without reading or reusing its value.
    "set-cookie": `${VISITOR_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  } });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "This request could not be verified." }, { status: 403 });
  }

  if (!mayRecordAggregateProfileView({
    profileChoice: normalizeProfileViewChoice(request.headers.get("x-elevare-profile-statistics")),
    analyticsChoice: normalizeProfileViewChoice(request.headers.get("x-elevare-analytics-consent")),
    privacySignal: request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1",
    country: process.env.VERCEL === "1" ? request.headers.get("x-vercel-ip-country") : null,
  })) return completedView();
  if (
    request.headers.get("purpose") === "prefetch"
    || request.headers.get("sec-purpose")?.includes("prefetch")
    || BOT_PATTERN.test(request.headers.get("user-agent") ?? "")
  ) {
    return completedView();
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
  if (typeof professionalId !== "string" || !UUID_PATTERN.test(professionalId)
    || Object.keys(payload as object).some((key) => key !== "professionalId")) {
    return Response.json({ error: "The profile could not be identified." }, { status: 400 });
  }

  const config = getSecondarySupabaseServerConfig();
  if (!config.url || !config.anonKey || !config.serviceRoleKey) {
    return Response.json({ error: "Profile view tracking is unavailable." }, { status: 503 });
  }

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = bearerToken(request);
  if (token) {
    const { data: authData } = await supabase.auth.getUser(token);
    const authUserId = authData.user?.id;
    if (authUserId) {
      const { data: account } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", authUserId)
        .maybeSingle();
      const accountRole = typeof account?.role === "string" ? account.role.toLowerCase() : "";
      if (accountRole === "admin" || accountRole === "super_admin") {
        return completedView();
      }
      if (account?.id) {
        const { data: ownerProfile } = await supabase
          .from("trainer_profiles")
          .select("id")
          .eq("id", professionalId)
          .eq("user_id", account.id)
          .maybeSingle();
        if (ownerProfile) {
          return completedView();
        }
      }
    }
  }

  const { error } = await supabase.rpc("record_public_professional_profile_page_view", {
    p_trainer_profile_id: professionalId,
  });

  if (error) {
    console.error("Professional profile view tracking failed.", { code: error.code });
    return Response.json({ error: "Profile view tracking is unavailable." }, { status: 503 });
  }

  return completedView(true);
}
