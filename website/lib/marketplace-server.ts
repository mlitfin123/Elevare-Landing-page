import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "./supabase-projects.ts";

export function getMarketplaceServerClient(accessToken?: string) {
  const config = getSecondarySupabaseServerConfig();
  const serverUrl = process.env.SECOND_SUPABASE_URL?.replace(/\/$/, "");
  const publicUrl = process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL?.replace(/\/$/, "");
  if (serverUrl && publicUrl && serverUrl !== publicUrl) throw new Error("MARKETPLACE_PROJECT_MISMATCH");
  const key = accessToken ? config.anonKey : config.serviceRoleKey;
  if (!config.url || !key) throw new Error("MARKETPLACE_NOT_CONFIGURED");
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      // Only the tagged server cache caches public data. Auth and PostgREST do not.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
