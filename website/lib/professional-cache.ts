// Central public routing identifiers, never account data or profile values.
export const professionalCache = {
  collection: "professionals", homepage: "homepage-professionals", sitemap: "professionals-sitemap",
  categories: "professional-categories",
  id: (id: string) => `professional:${id}`,
  slug: (slug: string) => `professional-slug:${slug}`,
  category: (slug: string) => `professionals-category:${slug}`,
  location: (key: string) => `professionals-location:${key}`,
};
export const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const professionalIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const professionalEventTypes = ["profile_changed", "trust_expired"] as const;
export type ProfessionalEventType = typeof professionalEventTypes[number];
export type InvalidationRecord = {
  professional_id: string; revision: number; delivered_revision: number;
  slugs: string[]; categories: string[]; locations: string[]; collection_changed: boolean;
};
export function invalidationTargets(event: InvalidationRecord) {
  const slugs = event.slugs.filter((slug) => slug.length <= 160 && publicSlugPattern.test(slug));
  const categories = event.categories.filter((slug) => slug.length <= 160 && publicSlugPattern.test(slug));
  const tags = new Set([professionalCache.id(event.professional_id), ...slugs.map(professionalCache.slug)]);
  const paths = new Set<string>();
  for (const prefix of ["", "/es", "/pt-br"]) {
    for (const slug of slugs) paths.add(`${prefix}/professionals/${slug}/`);
  }
  if (event.collection_changed) {
    tags.add(professionalCache.collection); tags.add(professionalCache.homepage); tags.add(professionalCache.sitemap);
    categories.forEach((slug) => tags.add(professionalCache.category(slug)));
    event.locations.filter((key) => /^[a-z0-9-]{1,160}$/.test(key)).forEach((key) => tags.add(professionalCache.location(key)));
    for (const prefix of ["", "/es", "/pt-br"]) {
      paths.add(`${prefix}/`); paths.add(`${prefix}/professionals/`);
      categories.forEach((slug) => paths.add(`${prefix}/professionals/${slug}/`));
    }
    paths.add("/sitemaps/professionals.xml"); paths.add("/marketplace-data.json");
  }
  return { tags: [...tags], paths: [...paths] };
}
