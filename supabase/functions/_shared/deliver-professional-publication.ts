type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function deliverProfessionalPublication(
  client: RpcClient, website: string, secret: string, request: typeof fetch = fetch,
) {
  const expiration = await client.rpc("marketplace_enqueue_expired_public_trust");
  if (expiration.error) throw new Error("EXPIRATION_ENQUEUE_FAILED");
  const pending = await client.rpc("marketplace_pending_publication_events");
  if (pending.error || !Array.isArray(pending.data)) throw new Error("PENDING_READ_FAILED");
  let failed = 0;
  for (const event of pending.data.slice(0, 25) as Array<{ professional_id: string }>) {
    try {
      const response = await request(new URL("/api/internal/professional-revalidation/", website), {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({ professionalId: event.professional_id, eventType: "profile_changed" }),
      });
      if (!response.ok) { failed++; continue; }
      const result = await response.json();
      if (result.status === "invalidated" && Number.isSafeInteger(result.revision)) {
        const acknowledged = await client.rpc("marketplace_ack_publication_event", {
          p_professional_id: event.professional_id, p_revision: result.revision,
        });
        if (acknowledged.error) failed++;
      } else if (result.status !== "current") failed++;
    } catch { failed++; }
  }
  return { processed: Math.min(pending.data.length, 25), failed };
}
