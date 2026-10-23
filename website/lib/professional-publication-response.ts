// A lost or malformed response is an unknown write outcome, never a saved draft.
export async function requestProfessionalPublication(
  payload: Record<string, unknown>, token: string, request: typeof fetch = fetch,
) {
  const failure = (code: string) => ({ data: null, error: { code }, propagation: "delayed" });
  try {
    const response = await request("/api/professional-publication/", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      if (response.status === 401) return failure("unauthorized");
      if (response.status === 409) return failure("conflict");
      if (response.status >= 500) return failure("network");
      return failure(response.status === 400 ? "invalid_request" : "save_failed");
    }
    const result = await response.json();
    if (!result || !["current", "delayed"].includes(result.propagation)) return failure("network");
    if (payload.action === "profile" && (
      typeof result.record?.profile?.id !== "string"
      || typeof result.record?.profile?.updated_at !== "string"
      || !result.record?.status || !Array.isArray(result.record?.credentials)
    )) return failure("network");
    return { data: result.record, error: null, propagation: result.propagation as string };
  } catch { return failure("network"); }
}
