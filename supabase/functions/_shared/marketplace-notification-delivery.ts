import { buildConciergeNotification, type ConciergeNotificationEvent } from "./concierge-notification-templates.ts";
import { formatProfessionalApprovalSender } from "../professional-approval-email/email.ts";

export const DEFAULT_ADMIN_ALERT_EMAIL = "mlitfin@elevarefit.org";
const EVENTS = new Set<ConciergeNotificationEvent>([
  "client_request_received", "professional_invited", "professional_response_reminder",
  "client_shortlist_ready", "client_selection_received", "introduction_completed",
  "follow_up_request", "rematch_confirmation", "case_closed",
]);
const ADMIN_COPY: Record<string, [string, string]> = {
  admin_match_requested: ["New match request", "A new match request is waiting in Concierge."],
  admin_professional_submitted: ["Professional profile submitted for review", "A professional profile is waiting for your review."],
  admin_consultation_requested: ["New consultation inquiry", "A client submitted a consultation inquiry to a professional."],
  professional_response_received: ["Professional responded to a match invitation", "A professional responded to a Concierge invitation. Review the case for the next step."],
};
type RpcResult = { data: unknown; error: unknown };
export type NotificationClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult>;
};
export type NotificationConfig = {
  resendApiKey: string;
  from: string;
  replyTo: string;
  adminEmail?: string;
  adminUrl?: string;
};
type Claim = { id: string; lock_token: string; idempotency_key: string };
type Context = { role: "client" | "professional" | "operator"; event_type: string; reference: string; email?: string; locale: string };

const uuid = (value: unknown): value is string => typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);
const email = (value: unknown): value is string => typeof value === "string" && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
const reference = (value: unknown): value is string => typeof value === "string" && (/^EVR-[A-F0-9]{12}$/.test(value) || uuid(value));
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export function notificationConfigValid(config: NotificationConfig) {
  return Boolean(config.resendApiKey) && email(config.replyTo) && email(config.adminEmail ?? DEFAULT_ADMIN_ALERT_EMAIL);
}

export function buildMarketplaceNotification(context: Context, config: NotificationConfig) {
  if (!reference(context.reference)) throw new Error("invalid_context");
  const common = { from: formatProfessionalApprovalSender(config.from), reply_to: config.replyTo };
  if (context.role === "operator") {
    const copy = Object.hasOwn(ADMIN_COPY, context.event_type) ? ADMIN_COPY[context.event_type] : undefined;
    const recipient = config.adminEmail ?? DEFAULT_ADMIN_ALERT_EMAIL;
    if (!copy || !email(recipient)) throw new Error("invalid_context");
    let adminLink = "Open the Elevare admin app to review it.";
    if (config.adminUrl) {
      const url = new URL(config.adminUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid_context");
      adminLink += `\n${url.href}`;
    }
    const text = `${copy[1]}\n\nReference: ${context.reference}\n\n${adminLink}`;
    return { ...common, to: [recipient], subject: `Elevare: ${copy[0]}`, text,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(copy[1])}</p><p>Reference: ${escapeHtml(context.reference)}</p><p>${escapeHtml(adminLink).replaceAll("\n", "<br>")}</p></div>` };
  }
  if (!email(context.email) || !EVENTS.has(context.event_type as ConciergeNotificationEvent)
    || !["client", "professional"].includes(context.role)) throw new Error("invalid_context");
  const rendered = buildConciergeNotification({ eventType: context.event_type as ConciergeNotificationEvent,
    recipientRole: context.role, locale: context.locale, caseCode: context.reference, supportEmail: config.replyTo });
  const prefix = context.locale === "es-419" ? "/es" : context.locale === "pt-BR" ? "/pt-br" : "";
  const label = context.locale === "es-419" ? "Preferencias de correo" : context.locale === "pt-BR" ? "Preferências de e-mail" : "Email preferences";
  const preferencesUrl = `https://www.elevarefit.com${prefix}/account/#email-notifications`;
  const preferencesHtml = `<p style="text-align:center;font:14px Arial,sans-serif"><a href="${preferencesUrl}" style="color:#18d8c2">${label}</a></p>`;
  return { ...common, to: [context.email], subject: rendered.subject,
    html: rendered.html.replace("</body>", `${preferencesHtml}</body>`),
    text: `${rendered.text}\n\n${label}: ${preferencesUrl}` };
}

export async function deliverMarketplaceNotifications(
  client: NotificationClient, config: NotificationConfig, request: typeof fetch = fetch,
  options: { maxJobs?: number; now?: () => number } = {},
) {
  if (!notificationConfigValid(config)) throw new Error("notification_configuration_missing");
  const now = options.now ?? Date.now;
  const deadline = now() + 25_000;
  const prepared = await client.rpc("marketplace_prepare_notification_reminders");
  if (prepared.error) throw new Error("notification_preparation_failed");
  const result = { sent: 0, failed: 0, cancelled: 0 };
  for (let index = 0; index < Math.min(10, options.maxJobs ?? 10) && now() < deadline; index++) {
    const claimed = await client.rpc("marketplace_claim_notification");
    if (claimed.error) throw new Error("notification_claim_failed");
    if (!claimed.data) break;
    const claim = claimed.data as Claim;
    if (!uuid(claim.id) || !uuid(claim.lock_token) || claim.idempotency_key !== `marketplace-email:${claim.id}`) throw new Error("invalid_claim");
    const finish = async (state: "sent" | "failed" | "cancelled", extra: Record<string, unknown> = {}) => {
      const completed = await client.rpc("marketplace_finish_notification", {
        p_id: claim.id, p_lock_token: claim.lock_token, p_result: state, ...extra,
      });
      if (completed.error || completed.data !== true) throw new Error("notification_ack_failed");
      result[state]++;
    };
    const resolved = await client.rpc("marketplace_notification_delivery_context", { p_id: claim.id, p_lock_token: claim.lock_token });
    if (resolved.error) throw new Error("notification_recipient_check_failed");
    if (!resolved.data) {
      await finish("cancelled", { p_error_code: "recipient_unavailable" });
      continue;
    }
    let message: ReturnType<typeof buildMarketplaceNotification>;
    try { message = buildMarketplaceNotification(resolved.data as Context, config); }
    catch { await finish("cancelled", { p_error_code: "invalid_context" }); continue; }

    let response: Response;
    let providerId: unknown;
    try {
      response = await request("https://api.resend.com/emails", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000),
        headers: { authorization: `Bearer ${config.resendApiKey}`, "content-type": "application/json", "idempotency-key": claim.idempotency_key },
        body: JSON.stringify(message),
      });
      // Provider error bodies can contain private data. Never persist or log them.
      if (response.ok) providerId = (await response.json() as { id?: unknown }).id;
    } catch {
      await finish("failed", { p_error_code: "network" });
      continue;
    }
    if (!response.ok || typeof providerId !== "string" || !providerId.trim()) {
      const code = response.status === 429 ? "rate_limited" : response.status === 409 ? "idempotency_conflict" : "provider_rejected";
      await finish("failed", { p_error_code: code, p_retryable: response.status === 429 || response.status >= 500 || response.ok });
      continue;
    }
    // Keep an ambiguous acknowledgement leased. A later invocation uses the
    // same provider key; never send under a new key after a response was lost.
    await finish("sent", { p_provider_message_id: providerId });
  }
  return result;
}

export async function handleMarketplaceNotificationRequest(
  request: Request, serviceKey: string | undefined, enabled: boolean,
  deliver: () => Promise<{ sent: number; failed: number; cancelled: number }>,
  verifyServiceRole?: (authorization: string) => Promise<boolean>,
) {
  const headers = { "cache-control": "no-store", "content-type": "application/json" };
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  if (!serviceKey) return new Response('{"error":"unavailable"}', { status: 503, headers });
  const actual = await digest(request.headers.get("authorization") ?? "");
  const expected = await digest(`Bearer ${serviceKey}`);
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  if (difference) {
    // Supabase can inject a different service JWT from the project's legacy
    // scheduler key. Verify its role through a read-only, service-only RPC;
    // decoding an unsigned claim or trusting the gateway alone is insufficient.
    let verified = false;
    const authorization = request.headers.get("authorization") ?? "";
    if (/^Bearer [A-Za-z0-9_.-]+$/.test(authorization) && verifyServiceRole) {
      try { verified = await verifyServiceRole(authorization); } catch { /* Fail closed. */ }
    }
    if (!verified) return new Response('{"error":"unauthorized"}', { status: 401, headers });
  }
  if (request.method !== "POST") return new Response('{"error":"method_not_allowed"}', { status: 405, headers });
  if (!enabled) return new Response('{"error":"delivery_disabled"}', { status: 503, headers });
  // The scheduler supplies no recipient, event or content. Reject payload-based
  // attempts to turn this bounded queue drainer into a general email endpoint.
  const reader = request.body?.getReader();
  let size = 0; const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 128) { await reader.cancel(); return new Response('{"error":"invalid_body"}', { status: 400, headers }); }
      chunks.push(part.value);
    }
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const text = new TextDecoder().decode(bytes).trim();
  if (text && text !== "{}") return new Response('{"error":"invalid_body"}', { status: 400, headers });
  try {
    const result = await deliver();
    return new Response(JSON.stringify(result), { status: result.failed ? 503 : 200, headers });
  } catch { return new Response('{"error":"retry_later"}', { status: 503, headers }); }
}
