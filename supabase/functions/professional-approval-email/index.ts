import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildProfessionalApprovalEmail,
  DEFAULT_SUPPORT_EMAIL,
  formatProfessionalApprovalSender,
  getProfessionalApprovalTemplateId,
  isServiceRoleRequest,
  professionalApprovalEventKey,
  resolveProfessionalApprovalEmailLocale,
  safeDeliveryError,
} from "./email.ts";

const RESEND_API_BASE = "https://api.resend.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_TRANSACTIONAL_FROM = formatProfessionalApprovalSender(
  Deno.env.get("RESEND_TRANSACTIONAL_FROM"),
);
const RESEND_TRANSACTIONAL_REPLY_TO =
  Deno.env.get("RESEND_TRANSACTIONAL_REPLY_TO")?.trim() || DEFAULT_SUPPORT_EMAIL;

type RequestPayload = {
  action?: "approve" | "retry";
  professional_id?: string;
};

type ClaimResult = {
  claimed?: boolean;
  reason?: string;
  event_id?: string;
  event_key?: string;
  lock_token?: string;
  provider_message_id?: string;
  attempt_count?: number;
  max_attempts?: number;
};

class DeliveryError extends Error {
  constructor(readonly status?: number) {
    super("Transactional email delivery failed.");
    this.name = "DeliveryError";
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, message: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!isServiceRoleRequest(authorization)) {
    return json({ ok: false, message: "Unauthorized." }, 401);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, message: "Server configuration is incomplete." }, 500);
  }

  let payload: RequestPayload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400);
  }

  const action = payload.action ?? "approve";
  const professionalId = payload.professional_id?.trim() ?? "";

  if ((action !== "approve" && action !== "retry") || !isUuid(professionalId)) {
    return json({ ok: false, message: "Invalid approval request." }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let approval: Record<string, unknown>;
  if (action === "approve") {
    const { data, error } = await supabase.rpc("marketplace_approve_professional_and_enqueue", {
      p_professional_id: professionalId,
    });

    if (error || !data) {
      console.error("professional approval failed", {
        professionalId,
        eventType: "professional_approved",
        status: "approval_failed",
        timestamp: new Date().toISOString(),
      });
      return json({ ok: false, message: "The professional could not be approved." }, 500);
    }

    approval = data as Record<string, unknown>;
    console.info("professional approval recorded", {
      professionalId,
      eventType: "professional_approved",
      transitioned: approval.transitioned === true,
      timestamp: new Date().toISOString(),
    });
  } else {
    const { data, error } = await supabase
      .from("trainer_profiles")
      .select("id, verification_status, profile_live")
      .eq("id", professionalId)
      .maybeSingle();

    if (
      error ||
      !data ||
      String(data.verification_status).toLowerCase() !== "verified" ||
      data.profile_live !== true
    ) {
      return json({ ok: false, message: "Only approved professionals can receive this email." }, 409);
    }

    approval = { professional_id: professionalId, approved: true, transitioned: false };
  }

  const delivery = await deliverApprovalEmail({
    supabase,
    professionalId,
    allowFailedRetry: action === "retry",
  });

  return json({ ok: true, approved: true, ...approval, ...delivery });
});

async function deliverApprovalEmail({
  supabase,
  professionalId,
  allowFailedRetry,
}: {
  supabase: ReturnType<typeof createClient>;
  professionalId: string;
  allowFailedRetry: boolean;
}) {
  const { data: claimData, error: claimError } = await supabase.rpc(
    "marketplace_claim_professional_approval_email",
    {
      p_professional_id: professionalId,
      p_allow_failed_retry: allowFailedRetry,
    },
  );

  if (claimError) {
    console.error("professional approval email claim failed", {
      professionalId,
      eventType: "professional_approved",
      status: "claim_failed",
      timestamp: new Date().toISOString(),
    });
    return { email_status: "pending", retry_available: true };
  }

  const claim = (claimData ?? {}) as ClaimResult;
  if (!claim.claimed) {
    return mapUnclaimedResult(claim);
  }

  const eventId = claim.event_id ?? "";
  const lockToken = claim.lock_token ?? "";

  try {
    if (!RESEND_API_KEY) throw new DeliveryError();

    const { data: profile, error: profileError } = await supabase
      .from("trainer_profiles")
      .select("id, user_id, public_display_name, verification_status, profile_live")
      .eq("id", professionalId)
      .single();

    if (
      profileError ||
      !profile ||
      String(profile.verification_status).toLowerCase() !== "verified" ||
      profile.profile_live !== true
    ) {
      throw new DeliveryError();
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, first_name, preferred_locale, auth_id")
      .eq("id", profile.user_id)
      .single();

    const recipientEmail = user?.email?.trim().toLowerCase() ?? "";
    if (userError || !isValidEmail(recipientEmail)) throw new DeliveryError();

    let authMetadata: Record<string, unknown> = {};
    if (typeof user?.auth_id === "string" && isUuid(user.auth_id)) {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user.auth_id);
      if (!authError && authData.user?.user_metadata) {
        authMetadata = authData.user.user_metadata;
      }
    }

    const locale = resolveProfessionalApprovalEmailLocale({
      preferredLocale: user?.preferred_locale,
      professionalSignupLocale: metadataString(authMetadata, "professional_signup_locale"),
      signupLocale: metadataString(authMetadata, "signup_locale"),
      browserLocaleAtSignup: metadataString(authMetadata, "browser_locale_at_signup"),
    });

    const email = buildProfessionalApprovalEmail({
      firstName: user?.first_name,
      locale,
      supportEmail: RESEND_TRANSACTIONAL_REPLY_TO,
    });

    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": professionalApprovalEventKey(professionalId),
      },
      body: JSON.stringify({
        from: RESEND_TRANSACTIONAL_FROM,
        to: [recipientEmail],
        reply_to: RESEND_TRANSACTIONAL_REPLY_TO,
        subject: email.subject,
        template: {
          id: getProfessionalApprovalTemplateId(locale),
        },
        tags: [
          { name: "category", value: "transactional" },
          { name: "event", value: "professional_approved" },
        ],
      }),
    });

    if (!response.ok) throw new DeliveryError(response.status);

    const responseData = await response.json() as { id?: unknown };
    const providerMessageId = typeof responseData.id === "string" ? responseData.id.trim() : "";
    if (!providerMessageId) throw new DeliveryError(response.status);

    const { data: completed, error: completionError } = await supabase.rpc(
      "marketplace_complete_professional_approval_email",
      {
        p_event_id: eventId,
        p_lock_token: lockToken,
        p_provider_message_id: providerMessageId,
      },
    );

    if (completionError || !(completed as { completed?: boolean } | null)?.completed) {
      throw new DeliveryError();
    }

    console.info("professional approval email sent", {
      professionalId,
      eventType: "professional_approved",
      status: "sent",
      providerMessageId,
      attemptCount: claim.attempt_count,
      timestamp: new Date().toISOString(),
    });

    return {
      email_status: "sent",
      provider_message_id: providerMessageId,
      retry_available: false,
    };
  } catch (error) {
    const safeError = safeDeliveryError(error instanceof DeliveryError ? error.status : undefined);
    const { data: failureData } = await supabase.rpc(
      "marketplace_fail_professional_approval_email",
      {
        p_event_id: eventId,
        p_lock_token: lockToken,
        p_error_code: safeError.code,
        p_error_message: safeError.message,
      },
    );
    const failure = failureData as { retry_available?: boolean } | null;

    console.warn("professional approval email delivery failed", {
      professionalId,
      eventType: "professional_approved",
      status: "failed",
      attemptCount: claim.attempt_count,
      retryAvailable: failure?.retry_available === true,
      timestamp: new Date().toISOString(),
    });

    return {
      email_status: "failed",
      retry_available: failure?.retry_available === true,
    };
  }
}

function mapUnclaimedResult(claim: ClaimResult) {
  if (claim.reason === "already_sent") {
    return {
      email_status: "already_sent",
      provider_message_id: claim.provider_message_id,
      retry_available: false,
    };
  }

  if (claim.reason === "retry_exhausted") {
    return { email_status: "failed", retry_available: false };
  }

  if (claim.reason === "retry_required") {
    return { email_status: "failed", retry_available: true };
  }

  if (claim.reason === "not_queued") {
    return { email_status: "not_queued", retry_available: false };
  }

  return { email_status: "processing", retry_available: false };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
