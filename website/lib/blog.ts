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

export type BlogCategorySeo = {
  title: string;
  description: string;
  heading: string;
  introduction: string;
};

export const MIN_INDEXABLE_BLOG_CATEGORY_POSTS = 2;

const BLOG_CATEGORY_SEO: Record<BlogCategory, BlogCategorySeo> = {
  tracking: {
    title: "Fitness Tracking Guides",
    description: "Practical fitness tracking guides for monitoring calories, workouts, bodyweight, and progress without making the process unnecessarily complicated.",
    heading: "Fitness tracking guides",
    introduction: "Learn how to use simple, consistent tracking to understand your habits, measure progress, and make better training and nutrition decisions.",
  },
  nutrition: {
    title: "Nutrition and Weight Loss Guides",
    description: "Straightforward nutrition guides about calories, protein, weight loss, food choices, and building habits that support your fitness goals.",
    heading: "Nutrition and weight loss guides",
    introduction: "Explore practical explanations of calories, protein, food tracking, and the habits that make nutrition plans easier to follow over time.",
  },
  training: {
    title: "Strength and Workout Guides",
    description: "Training guides about workout structure, strength progression, exercise selection, and building a routine you can follow consistently.",
    heading: "Strength and workout guides",
    introduction: "Build a clearer training approach with practical guidance on workout structure, progression, and consistent exercise tracking.",
  },
  prep: {
    title: "Bodybuilding Contest Prep Guides",
    description: "Bodybuilding contest prep guides about conditioning, muscle retention, tracking progress, and making controlled adjustments throughout a prep.",
    heading: "Bodybuilding contest prep guides",
    introduction: "Read contest-prep articles about conditioning, muscle retention, progress tracking, and weekly plan changes.",
  },
  "prep-files": {
    title: "Prep Files: Bodybuilding Contest Prep Journal",
    description: "Follow a documented bodybuilding contest prep through weekly check-ins, progress photos, plan adjustments, setbacks, and lessons from the process.",
    heading: "Prep Files",
    introduction: "Follow the full contest-prep timeline through weekly data, progress photos, StageLab recommendations, plan adjustments, and honest reflections from each phase.",
  },
  coaching: {
    title: "Fitness Coaching Guides",
    description: "Guidance for choosing, working with, and getting more value from fitness and performance coaching relationships.",
    heading: "Fitness coaching guides",
    introduction: "Learn what to look for in a coaching relationship and how clear expectations, communication, and progress tracking support better decisions.",
  },
  "product-updates": {
    title: "ElevareFit Product Updates",
    description: "Product news and feature updates from Logbook, StageLab, Elevare, and the wider ElevareFit fitness ecosystem.",
    heading: "Product updates",
    introduction: "See what is changing across the ElevareFit ecosystem, including improvements to Logbook, StageLab, Elevare, and the site's free resources.",
  },
};

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

export function getBlogCategorySeo(category: BlogCategory) {
  return BLOG_CATEGORY_SEO[category];
}

export function isBlogCategoryIndexable(category: BlogCategory) {
  return getPostsByCategory(category).length >= MIN_INDEXABLE_BLOG_CATEGORY_POSTS;
}

export function getAdjacentPosts(post: BlogPostSummary) {
  const chronological = [...getPostsByCategory(post.category)].reverse();
  const index = chronological.findIndex((candidate) => candidate.slug === post.slug);

  return {
    previous: index > 0 ? chronological[index - 1] : null,
    next: index >= 0 && index < chronological.length - 1 ? chronological[index + 1] : null,
    related: chronological
      .filter((candidate) => candidate.slug !== post.slug)
      .sort((left, right) => {
        const postTime = parseBlogDate(post.date).getTime();
        const leftDistance = Math.abs(parseBlogDate(left.date).getTime() - postTime);
        const rightDistance = Math.abs(parseBlogDate(right.date).getTime() - postTime);

        return leftDistance - rightDistance;
      })
      .slice(0, 3),
  };
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
