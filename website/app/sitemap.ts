import type { MetadataRoute } from "next";
import { getAllCategories, getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/", "/apps", "/logbook", "/stagelab", "/elevare", "/blog"];

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date("2026-04-28"),
  }));

  const categoryEntries = getAllCategories().map((category) => ({
    url: absoluteUrl(`/blog/category/${category}`),
    lastModified: new Date("2026-04-28"),
  }));

  const postEntries = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...categoryEntries, ...postEntries];
}
