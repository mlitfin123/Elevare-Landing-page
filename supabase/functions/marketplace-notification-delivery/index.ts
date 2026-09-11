import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { DEFAULT_SUPPORT_EMAIL } from "../professional-approval-email/email.ts";
import { deliverMarketplaceNotifications, handleMarketplaceNotificationRequest } from "../_shared/marketplace-notification-delivery.ts";

Deno.serve((request) => handleMarketplaceNotificationRequest(
  request, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("MARKETPLACE_EMAIL_DELIVERY_ENABLED") === "true",
  async () => {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return await deliverMarketplaceNotifications(client, {
      resendApiKey: Deno.env.get("RESEND_API_KEY") ?? "",
      from: Deno.env.get("RESEND_TRANSACTIONAL_FROM") ?? "",
      replyTo: Deno.env.get("RESEND_TRANSACTIONAL_REPLY_TO") ?? DEFAULT_SUPPORT_EMAIL,
      adminEmail: Deno.env.get("MARKETPLACE_ADMIN_ALERT_EMAIL"),
      adminUrl: Deno.env.get("MARKETPLACE_ADMIN_URL"),
    });
  },
  async (authorization) => {
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization },
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(6_000) }) },
    });
    const { error } = await caller.rpc("marketplace_notification_recipient", { p_id: "00000000-0000-0000-0000-000000000000" });
    return !error;
  },
));
