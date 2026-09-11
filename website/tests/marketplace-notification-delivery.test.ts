import assert from "node:assert/strict";
import test from "node:test";
import { buildMarketplaceNotification, deliverMarketplaceNotifications, handleMarketplaceNotificationRequest,
  type NotificationClient } from "../../supabase/functions/_shared/marketplace-notification-delivery.ts";

const id = "11111111-1111-4111-8111-111111111111";
const lease = "22222222-2222-4222-8222-222222222222";
const config = { resendApiKey: "local-test-only", from: "noreply@example.invalid", replyTo: "support@example.invalid" };
const claim = { id, lock_token: lease, idempotency_key: `marketplace-email:${id}` };
const context = { role: "client" as const, event_type: "client_request_received", reference: "EVR-123456789ABC", locale: "en", email: "client@example.invalid" };

function fakeClient(overrides: Record<string, unknown> = {}) {
  const calls: { name: string; args?: Record<string, unknown> }[] = [];
  let claims = 0;
  const client: NotificationClient = { async rpc(name, args) {
    calls.push({ name, args });
    if (Object.hasOwn(overrides, name)) return { data: overrides[name], error: null };
    if (name === "marketplace_claim_notification") return { data: claims++ ? null : claim, error: null };
    if (name === "marketplace_notification_delivery_context") return { data: context, error: null };
    return { data: true, error: null };
  } };
  return { client, calls };
}

test("admin alerts have fixed routing, concise copy and no client-provided content", () => {
  for (const event_type of ["admin_match_requested", "admin_professional_submitted", "admin_consultation_requested"]) {
    const message = buildMarketplaceNotification({ ...context, role: "operator", event_type }, config);
    assert.deepEqual(message.to, ["mlitfin@elevarefit.org"]);
    assert.match(message.subject, /^Elevare:/);
    assert.match(message.text, /EVR-123456789ABC/);
    assert.ok(!message.text.includes(context.email));
    assert.ok(message.text.length < 300);
  }
  assert.throws(() => buildMarketplaceNotification({ ...context, role: "operator", event_type: "arbitrary_email" }, config));
  assert.throws(() => buildMarketplaceNotification({ ...context, reference: "<script>private</script>" }, config));
});

test("matching emails render all three languages and link to account email preferences", () => {
  for (const [locale, path] of [["en", "/account/"], ["es-419", "/es/account/"], ["pt-BR", "/pt-br/account/"]]) {
    const message = buildMarketplaceNotification({ ...context, locale }, config);
    assert.ok(message.text.includes(`https://www.elevarefit.com${path}#email-notifications`));
    assert.ok(message.html.includes(`https://www.elevarefit.com${path}#email-notifications`));
    assert.deepEqual(message.to, [context.email]);
  }
});

test("delivery rechecks ownership, uses a stable provider key, and acknowledges only its lease", async () => {
  const { client, calls } = fakeClient();
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(new Headers(init?.headers).get("idempotency-key"), `marketplace-email:${id}`);
    assert.equal(init?.redirect, "error");
    assert.equal(calls.at(-1)?.name, "marketplace_notification_delivery_context");
    return Response.json({ id: "provider-123" });
  };
  assert.deepEqual(await deliverMarketplaceNotifications(client, config, request), { sent: 1, failed: 0, cancelled: 0 });
  const finish = calls.find((call) => call.name === "marketplace_finish_notification")!;
  assert.equal(finish.args?.p_lock_token, lease);
  assert.equal(finish.args?.p_provider_message_id, "provider-123");
});

test("opt-out, stale ownership and obsolete events cancel without sending", async () => {
  const { client } = fakeClient({ marketplace_notification_delivery_context: null });
  let sent = false;
  const result = await deliverMarketplaceNotifications(client, config, async () => { sent = true; return Response.json({}); });
  assert.equal(sent, false); assert.equal(result.cancelled, 1);
});

test("transient failures retry; permanent provider rejection never logs private error bodies", async () => {
  for (const [status, retryable] of [[429, true], [503, true], [422, false], [409, false]] as const) {
    const { client, calls } = fakeClient();
    const result = await deliverMarketplaceNotifications(client, config, async () => new Response("PRIVATE_PROVIDER_BODY", { status }));
    assert.equal(result.failed, 1);
    const finish = calls.find((call) => call.name === "marketplace_finish_notification")!;
    assert.equal(finish.args?.p_retryable, retryable);
    assert.ok(!JSON.stringify(calls).includes("PRIVATE_PROVIDER_BODY"));
  }
});

test("uncertain network results remain retryable with the same event identity", async () => {
  const { client, calls } = fakeClient();
  assert.equal((await deliverMarketplaceNotifications(client, config, async () => { throw Error("private network detail"); })).failed, 1);
  const finish = calls.find((call) => call.name === "marketplace_finish_notification")!;
  assert.equal(finish.args?.p_error_code, "network");
  assert.ok(!JSON.stringify(calls).includes("private network detail"));
});

test("an ambiguous acknowledgement does not overwrite the lease or pretend delivery succeeded", async () => {
  const { client, calls } = fakeClient({ marketplace_finish_notification: false });
  await assert.rejects(deliverMarketplaceNotifications(client, config, async () => Response.json({ id: "sent" })), /ack_failed/);
  assert.equal(calls.filter((call) => call.name === "marketplace_finish_notification").length, 1);
});

test("bounded delivery processes at most ten events per invocation", async () => {
  const { client } = fakeClient({ marketplace_claim_notification: claim });
  assert.equal((await deliverMarketplaceNotifications(client, config, async () => Response.json({ id: "sent" }), { maxJobs: 100 })).sent, 10);
});

test("the endpoint rejects public callers and caller-selected recipients", async () => {
  let delivered = 0;
  const deliver = async () => { delivered++; return { sent: 0, failed: 0, cancelled: 0 }; };
  const key = "local-scheduler-test-only";
  const invoke = (body: string, token = key, enabled = true, method = "POST") => handleMarketplaceNotificationRequest(
    new Request("https://example.invalid/function", { method, headers: { authorization: `Bearer ${token}` }, ...(method === "POST" ? { body } : {}) }), key, enabled, deliver);
  assert.equal((await invoke("{}", "wrong")).status, 401);
  assert.equal((await invoke("{}", key, false)).status, 503);
  assert.equal((await invoke('{"to":"other@example.invalid"}')).status, 400);
  assert.equal((await invoke("x".repeat(129))).status, 400);
  assert.equal((await invoke("", key, true, "GET")).status, 405);
  assert.equal(delivered, 0);
  assert.equal((await invoke("{}")).status, 200);
  assert.equal(delivered, 1);
});

test("alternate service credentials require an authoritative role check and verification failures deny access", async () => {
  let delivered = 0;
  const invoke = (verify: (authorization: string) => Promise<boolean>) => handleMarketplaceNotificationRequest(
    new Request("https://example.invalid/function", { method: "POST", headers: { authorization: "Bearer alternate-service-token" }, body: "{}" }),
    "injected-service-token", true, async () => { delivered++; return { sent: 0, failed: 0, cancelled: 0 }; }, verify);
  assert.equal((await invoke(async () => false)).status, 401);
  assert.equal((await invoke(async () => { throw Error("database unavailable"); })).status, 401);
  assert.equal(delivered, 0);
  assert.equal((await invoke(async authorization => authorization === "Bearer alternate-service-token")).status, 200);
  assert.equal(delivered, 1);
});
