"use client";
import { getSupabaseBrowserClient } from "./supabase-browser";

export async function saveProfessionalSection(payload: Record<string, unknown>) {
  try {
    const client = getSupabaseBrowserClient();
    const session = await client?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return { data: null, error: { code: "unauthorized" }, propagation: "delayed" };
    const response = await fetch("/api/professional-publication/", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return response.ok ? { data: result.record, error: null, propagation: result.propagation }
      : { data: null, error: { code: response.status >= 500 ? "network" : result.error as string }, propagation: "delayed" };
  } catch { return { data: null, error: { code: "network" }, propagation: "delayed" }; }
}
