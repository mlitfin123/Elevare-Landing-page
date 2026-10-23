"use client";
import { getSupabaseBrowserClient } from "./supabase-browser";
import { requestProfessionalPublication } from "./professional-publication-response";

export async function saveProfessionalSection(payload: Record<string, unknown>) {
  try {
    const client = getSupabaseBrowserClient();
    const session = await client?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return { data: null, error: { code: "unauthorized" }, propagation: "delayed" };
    return await requestProfessionalPublication(payload, token);
  } catch { return { data: null, error: { code: "network" }, propagation: "delayed" }; }
}
