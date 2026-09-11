import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { getMarketplaceServerClient } from "./marketplace-server.ts";
import { invalidationTargets, type InvalidationRecord } from "./professional-cache.ts";

export async function revalidateProfessional(professionalId: string) {
  const client = getMarketplaceServerClient();
  // The durable row includes committed old/new slugs and membership. Payload
  // event ordering is irrelevant: readers always resolve current database data.
  const { data, error } = await client.from("professional_publication_outbox")
    .select("professional_id,revision,delivered_revision,slugs,categories,locations,collection_changed")
    .eq("professional_id", professionalId).maybeSingle();
  if (error) throw new Error("EVENT_READ_FAILED");
  if (!data || data.revision <= data.delivered_revision) return { status: "current" as const };
  const event = data as InvalidationRecord;
  const targets = invalidationTargets(event);
  for (const tag of targets.tags) revalidateTag(tag, { expire: 0 });
  for (const path of targets.paths) revalidatePath(path);
  // A racing commit must not be acknowledged or have its accumulated targets
  // cleared by this delivery. Retry after any failure simply expires again.
  // The delivery worker acknowledges only after the entire HTTP response has
  // succeeded, including Next.js's deferred cache flush. Website saves leave
  // the durable event pending for that worker; repeating invalidation is safe.
  return { status: "invalidated" as const, revision: event.revision };
}

export async function tryRevalidateProfessional(professionalId: string) {
  try { await revalidateProfessional(professionalId); return "current" as const; }
  catch {
    console.error(JSON.stringify({ event: "professional_public_revalidation_failed", category: "retryable" }));
    return "delayed" as const;
  }
}
