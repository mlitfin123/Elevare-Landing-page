export function getSafeAuthRedirect(value: string | null | undefined, fallback = "/account/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  try {
    const parsed = new URL(value, "https://www.elevarefit.com");
    if (parsed.origin !== "https://www.elevarefit.com") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
