import { PRIMARY_SITE_ORIGIN } from "./site.ts";

export function getProfessionalSharingLinks(publicPath: string) {
  // Share the production profile even when the dashboard is open in a preview.
  if (!/^\/(?:es\/|pt-br\/)?professionals\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(publicPath)) return null;
  const profileUrl = new URL(`${publicPath.replace(/\/$/, "")}/`, PRIMARY_SITE_ORIGIN).toString();
  const facebook = new URL("https://www.facebook.com/sharer/sharer.php");
  facebook.searchParams.set("u", profileUrl);
  return { profileUrl, facebookUrl: facebook.toString() };
}

export function getProfileCardFilename(publicPath: string) {
  const slug = publicPath.split("/").filter(Boolean).at(-1) ?? "profile";
  return `elevare-${slug.replace(/[^a-z0-9-]/gi, "").slice(0, 90) || "profile"}-instagram.png`;
}

// Bound layout work and strip control characters; user-written text is never HTML.
export function cleanProfileCardText(value: string, maximum = 180) {
  return Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim()).slice(0, maximum).join("");
}
