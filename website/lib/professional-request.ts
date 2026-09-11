import { createHash, timingSafeEqual } from "node:crypto";
import { professionalEventTypes, professionalIdPattern } from "./professional-cache.ts";

export function validRevalidationSecret(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header || header.length > 512) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

export async function readBoundedJson(request: Request, limit = 1024): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new Error("CONTENT_TYPE");
  if (Number(request.headers.get("content-length") ?? 0) > limit || !request.body) throw new Error("BODY_SIZE");
  const reader = request.body.getReader();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw new Error("BODY_SIZE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function parseProfessionalEvent(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_EVENT");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "eventType,professionalId"
    || typeof record.professionalId !== "string" || !professionalIdPattern.test(record.professionalId)
    || !professionalEventTypes.some((type) => type === record.eventType)) throw new Error("INVALID_EVENT");
  return { professionalId: record.professionalId, eventType: record.eventType };
}
