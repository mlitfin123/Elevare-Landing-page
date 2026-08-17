"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export function isMarketplaceAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL && process.env.NEXT_PUBLIC_SECOND_SUPABASE_ANON_KEY,
  );
}
