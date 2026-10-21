import type { ProfessionalSectionId } from "./professional-profile.ts";

const sections: Record<string, ProfessionalSectionId> = {
  name: "about", professionalTitle: "about", photo: "about", bio: "about", yearsExperience: "about",
  publicHeadline: "fit", bestFitSummary: "fit", goals: "fit", experienceLevels: "fit",
  coachingStyle: "fit", serviceBoundaries: "fit", primaryCategory: "offer", specialties: "offer", services: "offer",
  serviceModes: "work", location: "work", acceptance: "work", availability: "work", consultationExpectations: "work",
  pricing: "pricing", credentials: "credentials", website: "links", websiteLinkText: "links",
  instagram: "links", facebook: "links", tiktok: "links", youtube: "links", linkedin: "links",
};

export function profileFieldTarget(field: string) {
  if (field !== "terms" && !Object.hasOwn(sections, field)) return null;
  return { section: sections[field], id: `profile-field-${field === "primaryCategory" ? "specialties" : field}` };
}

export function focusProfileField(id: string, root: Document, reducedMotion: boolean) {
  const target = root.getElementById(id);
  if (!target) return false;
  const visible = (element: HTMLElement) => !element.matches(":disabled") && element.getClientRects().length > 0;
  const control = Array.from(target.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=file]),textarea,select"))
    .find(visible) ?? Array.from(target.querySelectorAll<HTMLButtonElement>("button")).find(visible);
  if (!control) target.setAttribute("tabindex", "-1");
  (control ?? target).focus({ preventScroll: true });
  target.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "center" });
  return true;
}
