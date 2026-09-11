import { createClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "@/lib/supabase-projects";
import { siteConfig } from "@/lib/site";

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

function cookieValue(request: Request, name: string) {
  const prefix = `${name}=`;
  return request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

function bearerToken(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "This request could not be verified." }, { status: 403 });
  }

  if (request.headers.get("x-elevare-analytics-consent") !== "accepted") {
    return Response.json({ error: "Analytics consent is required." }, { status: 403 });
  }
  if (
    request.headers.get("purpose") === "prefetch"
    || request.headers.get("sec-purpose")?.includes("prefetch")
    || BOT_PATTERN.test(request.headers.get("user-agent") ?? "")
  ) {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
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
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      }
      if (account?.id) {
        const { data: ownerProfile } = await supabase
          .from("trainer_profiles")
          .select("id")
          .eq("id", professionalId)
          .eq("user_id", account.id)
          .maybeSingle();
        if (ownerProfile) {
          return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
        }
      }
    }
  }

  const existingVisitorId = cookieValue(request, VISITOR_COOKIE);
  const visitorId = existingVisitorId && UUID_PATTERN.test(existingVisitorId)
    ? existingVisitorId
    : crypto.randomUUID();
  const day = new Date().toISOString().slice(0, 10);
  const visitorKeyHash = await sha256(`${visitorId}:${professionalId}:${day}:${config.serviceRoleKey}`);
  const { error } = await supabase.rpc("record_public_professional_profile_view", {
    p_trainer_profile_id: professionalId,
    p_visitor_key_hash: visitorKeyHash,
  });

  if (error) {
    console.error("Professional profile view tracking failed.", { code: error.code });
    return Response.json({ error: "Profile view tracking is unavailable." }, { status: 503 });
  }

  const headers = new Headers({ "cache-control": "no-store" });
  if (!existingVisitorId) {
    headers.append(
      "set-cookie",
      `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}
