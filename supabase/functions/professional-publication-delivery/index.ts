import { deliverProfessionalPublication } from "../_shared/deliver-professional-publication.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dormant until explicitly scheduled. A webhook may wake this bounded drainer;
// no webhook record contents, paths, tags, or public-state claims are trusted.
Deno.serve(async (request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("PROFESSIONAL_REVALIDATION_SECRET");
  const website = Deno.env.get("PROFESSIONAL_REVALIDATION_ORIGIN");
  const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  const actual = await digest(request.headers.get("authorization") ?? "");
  const expected = await digest(`Bearer ${serviceKey}`);
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  if (!serviceKey || difference !== 0) return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!secret || secret.length < 32 || !website || new URL(website).protocol !== "https:") return new Response("Unavailable", { status: 503 });
  const client = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
  try {
    const result = await deliverProfessionalPublication(client, website, secret);
    if (result.failed) console.error(JSON.stringify({ event: "professional_publication_delivery_failed", count: result.failed }));
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch { return new Response("Retry later", { status: 503 }); }
});
