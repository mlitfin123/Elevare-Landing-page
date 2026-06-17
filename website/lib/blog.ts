import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const BLOG_CATEGORIES = [
  "tracking",
  "nutrition",
  "training",
  "prep",
  "prep-files",
  "coaching",
  "product-updates",
] as const;

export const BLOG_PRODUCTS = ["Logbook", "StageLab", "Elevare"] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
export type BlogProduct = (typeof BLOG_PRODUCTS)[number];

export type BlogFrontmatter = {
  title: string;
  description: string;
  date: string;
  category: BlogCategory;
  product: BlogProduct;
  slug: string;
  published: boolean;
};

export type BlogPost = BlogFrontmatter & {
  content: string;
  hasInlineProductCTA: boolean;
};

export type BlogPostSummary = BlogFrontmatter;

const contentDirectory = path.join(process.cwd(), "content", "blog");
const publicDirectory = path.join(process.cwd(), "public");

function normalizeCategory(value: string): BlogCategory | null {
  const matchedCategory = BLOG_CATEGORIES.find(
    (category) => category.toLowerCase() === value.toLowerCase(),
  );

  return matchedCategory ?? null;
}

function normalizeProduct(value: string): BlogProduct | null {
  const matchedProduct = BLOG_PRODUCTS.find(
    (product) => product.toLowerCase() === value.toLowerCase(),
  );

  return matchedProduct ?? null;
}

function parseBlogDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date "${date}"`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function sortPosts(posts: BlogPostSummary[]) {
  return posts.sort((a, b) => {
    return parseBlogDate(b.date).getTime() - parseBlogDate(a.date).getTime();
  });
}

function readPostFile(fileName: string): BlogPost {
  const fullPath = path.join(contentDirectory, fileName);
  const source = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(source);

  if (
    typeof data.title !== "string" ||
    typeof data.description !== "string" ||
    typeof data.date !== "string" ||
    typeof data.slug !== "string" ||
    typeof data.published !== "boolean" ||
    typeof data.category !== "string" ||
    typeof data.product !== "string"
  ) {
    throw new Error(`Invalid frontmatter in ${fileName}`);
  }

  const normalizedCategory = normalizeCategory(data.category);
  const normalizedProduct = normalizeProduct(data.product);

  if (!normalizedCategory) {
    throw new Error(`Unsupported category "${data.category}" in ${fileName}`);
  }

  if (!normalizedProduct) {
    throw new Error(`Unsupported product "${data.product}" in ${fileName}`);
  }

  return {
    title: data.title,
    description: data.description,
    date: data.date,
    category: normalizedCategory,
    product: normalizedProduct,
    slug: data.slug,
    published: data.published,
    content: content.trim(),
    hasInlineProductCTA: /<ProductCTA\b/.test(content),
  };
}

export function getAllPosts(): BlogPostSummary[] {
  const fileNames = fs.readdirSync(contentDirectory).filter((fileName) => fileName.endsWith(".mdx"));

  const posts = fileNames
    .map((fileName) => readPostFile(fileName))
    .filter((post) => post.published)
    .map((post) => ({
      title: post.title,
      description: post.description,
      date: post.date,
      category: post.category,
      product: post.product,
      slug: post.slug,
      published: post.published,
    }));

  return sortPosts(posts);
}

export function getPostBySlug(slug: string): BlogPost | null {
  const fileNames = fs.readdirSync(contentDirectory).filter((fileName) => fileName.endsWith(".mdx"));

  for (const fileName of fileNames) {
    const post = readPostFile(fileName);

    if (post.slug === slug) {
      return post.published ? post : null;
    }
  }

  return null;
}

export function getBlogFeaturedImagePath(slug: string) {
  const extensions = ["png", "jpg", "jpeg", "webp"];

  for (const extension of extensions) {
    const relativePath = `/blog-posts/${slug}/featured.${extension}`;
    const absolutePath = path.join(publicDirectory, "blog-posts", slug, `featured.${extension}`);

    if (fs.existsSync(absolutePath)) {
      return relativePath;
    }
  }

  return null;
}

export function getPostsByCategory(category: BlogCategory): BlogPostSummary[] {
  return getAllPosts().filter((post) => post.category === category);
}

export function getAllCategories(): BlogCategory[] {
  const categories = new Set<BlogCategory>();

  for (const post of getAllPosts()) {
    categories.add(post.category);
  }

  return BLOG_CATEGORIES.filter((category) => categories.has(category));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseBlogDate(date));
}
