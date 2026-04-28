import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const BLOG_CATEGORIES = [
  "tracking",
  "nutrition",
  "training",
  "prep",
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
};

export type BlogPostSummary = BlogFrontmatter;

const contentDirectory = path.join(process.cwd(), "content", "blog");

function isValidCategory(value: string): value is BlogCategory {
  return BLOG_CATEGORIES.includes(value as BlogCategory);
}

function isValidProduct(value: string): value is BlogProduct {
  return BLOG_PRODUCTS.includes(value as BlogProduct);
}

function sortPosts(posts: BlogPostSummary[]) {
  return posts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
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

  if (!isValidCategory(data.category)) {
    throw new Error(`Unsupported category "${data.category}" in ${fileName}`);
  }

  if (!isValidProduct(data.product)) {
    throw new Error(`Unsupported product "${data.product}" in ${fileName}`);
  }

  return {
    title: data.title,
    description: data.description,
    date: data.date,
    category: data.category,
    product: data.product,
    slug: data.slug,
    published: data.published,
    content: content.trim(),
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
  }).format(new Date(date));
}
