import type { MetadataRoute } from "next";
import { getAllCategories, getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";
import { tools } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/", "/apps", "/tools", "/logbook", "/stagelab", "/elevare", "/blog"];

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(route === "/tools" ? "2026-06-10" : "2026-04-28"),
  }));

  const toolEntries = tools.map((tool) => ({
    url: absoluteUrl(`/tools/${tool.slug}`),
    lastModified: new Date("2026-06-10"),
  }));

  const categoryEntries = getAllCategories().map((category) => ({
    url: absoluteUrl(`/blog/category/${category}`),
    lastModified: new Date("2026-04-28"),
  }));

  const postEntries = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...toolEntries, ...categoryEntries, ...postEntries];
}
