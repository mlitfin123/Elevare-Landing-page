import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  DEFAULT_SUPPORT_EMAIL,
  formatProfessionalApprovalSender,
  resolveProfessionalApprovalEmailLocale,
  safeDeliveryError,
} from "../professional-approval-email/email.ts";
import {
  buildProfessionalInquiryEmail,
  professionalInquiryEventKey,
} from "./email.ts";

const RESEND_API_BASE = "https://api.resend.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_TRANSACTIONAL_FROM = formatProfessionalApprovalSender(Deno.env.get("RESEND_TRANSACTIONAL_FROM"));
const RESEND_TRANSACTIONAL_REPLY_TO = Deno.env.get("RESEND_TRANSACTIONAL_REPLY_TO")?.trim() || DEFAULT_SUPPORT_EMAIL;

type ClaimResult = {
  claimed?: boolean;
  event_id?: string;
  lock_token?: string;
};

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405, cors);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return json({ ok: false, message: "Server configuration is incomplete." }, 500, cors);
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return json({ ok: false, message: "Unauthorized." }, 401, cors);

  let inquiryId = "";
  try {
    const payload = await request.json() as { inquiry_id?: unknown };
    inquiryId = typeof payload.inquiry_id === "string" ? payload.inquiry_id.trim() : "";
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400, cors);
  }
  if (!isUuid(inquiryId)) return json({ ok: false, message: "Invalid consultation request." }, 400, cors);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ ok: false, message: "Unauthorized." }, 401, cors);

  const { data: caller, error: callerError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authData.user.id)
    .maybeSingle();
  const { data: inquiry, error: inquiryError } = await supabase
    .from("trainer_profile_inquiries")
    .select("id,trainer_profile_id,client_user_id")
    .eq("id", inquiryId)
    .maybeSingle();
  if (callerError || inquiryError || !caller || !inquiry || inquiry.client_user_id !== caller.id) {
    return json({ ok: false, message: "Consultation request not found." }, 404, cors);
  }

  const { data: claimData, error: claimError } = await supabase.rpc("marketplace_claim_professional_inquiry_email", {
    p_inquiry_id: inquiryId,
  });
  const claim = (claimData ?? {}) as ClaimResult;
  if (claimError) return json({ ok: false, message: "Notification delivery is pending." }, 503, cors);
  if (!claim.claimed) return json({ ok: true, notification_status: "already_processed" }, 200, cors);
  if (!isUuid(claim.event_id ?? "") || !isUuid(claim.lock_token ?? "")) {
    return json({ ok: false, message: "Notification delivery is pending." }, 503, cors);
  }
  const eventId = claim.event_id!;
  const lockToken = claim.lock_token!;

  try {
    const { data: profile, error: profileError } = await supabase
      .from("trainer_profiles")
      .select("user_id")
      .eq("id", inquiry.trainer_profile_id)
      .single();
    if (profileError || !profile) throw new Error("profile_unavailable");

    const { data: professional, error: professionalError } = await supabase
      .from("users")
      .select("email,first_name,preferred_locale,auth_id")
      .eq("id", profile.user_id)
      .single();
    const recipientEmail = professional?.email?.trim().toLowerCase() ?? "";
    if (professionalError || !isValidEmail(recipientEmail)) throw new Error("recipient_unavailable");

    let authMetadata: Record<string, unknown> = {};
    if (typeof professional.auth_id === "string" && isUuid(professional.auth_id)) {
      const { data } = await supabase.auth.admin.getUserById(professional.auth_id);
      authMetadata = data.user?.user_metadata ?? {};
    }
    const locale = resolveProfessionalApprovalEmailLocale({
      preferredLocale: professional.preferred_locale,
      professionalSignupLocale: metadataString(authMetadata, "professional_signup_locale"),
      signupLocale: metadataString(authMetadata, "signup_locale"),
      browserLocaleAtSignup: metadataString(authMetadata, "browser_locale_at_signup"),
    });
    const email = buildProfessionalInquiryEmail({
      firstName: professional.first_name,
      locale,
      supportEmail: RESEND_TRANSACTIONAL_REPLY_TO,
    });

    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": professionalInquiryEventKey(inquiryId),
      },
      body: JSON.stringify({
        from: RESEND_TRANSACTIONAL_FROM,
        to: [recipientEmail],
        reply_to: RESEND_TRANSACTIONAL_REPLY_TO,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: "category", value: "transactional" },
          { name: "event", value: "new_consultation_request" },
        ],
      }),
    });
    if (!response.ok) throw new Error(`resend_${response.status}`);
    const responseData = await response.json() as { id?: unknown };
    const providerMessageId = typeof responseData.id === "string" ? responseData.id.trim() : "";
    if (!providerMessageId) throw new Error("provider_message_missing");

    const { data: completed, error: completionError } = await supabase.rpc("marketplace_complete_professional_inquiry_email", {
      p_event_id: eventId,
      p_lock_token: lockToken,
      p_provider_message_id: providerMessageId,
    });
    if (completionError || completed !== true) throw new Error("outbox_completion_failed");
    return json({ ok: true, notification_status: "sent" }, 200, cors);
  } catch (error) {
    const status = error instanceof Error ? Number(error.message.replace("resend_", "")) || undefined : undefined;
    const safeError = safeDeliveryError(status);
    await supabase.rpc("marketplace_fail_professional_inquiry_email", {
      p_event_id: eventId,
      p_lock_token: lockToken,
      p_error_code: safeError.code,
    });
    return json({ ok: false, message: "The request was saved, but notification delivery is pending." }, 503, cors);
  }
});

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = origin === "https://www.elevarefit.com"
    || origin === "https://elevarefit.com"
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://www.elevarefit.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function bearerToken(value: string | null) {
  return value?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === "string" ? metadata[key] as string : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
