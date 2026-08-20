import { notFound } from "next/navigation";
import { BlogCard } from "@/components/BlogCard";
import {
  BLOG_CATEGORIES,
  getBlogCategorySeo,
  getAllCategories,
  getPostsByCategory,
  isBlogCategoryIndexable,
  type BlogCategory,
} from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCategories().map((category) => ({
    category,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  const normalizedCategory = category as BlogCategory;

  if (!BLOG_CATEGORIES.includes(normalizedCategory)) {
    return buildMetadata({
      title: "Article category not found",
      description: "The requested article category could not be found.",
      pathname: `/blog/category/${category}`,
      robots: { index: false, follow: true },
    });
  }

  const categorySeo = getBlogCategorySeo(normalizedCategory);

  return buildMetadata({
    title: categorySeo.title,
    description: categorySeo.description,
    pathname: `/blog/category/${category}`,
    robots: isBlogCategoryIndexable(normalizedCategory) ? undefined : { index: false, follow: true },
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!BLOG_CATEGORIES.includes(category as BlogCategory)) {
    notFound();
  }

  const posts = getPostsByCategory(category as BlogCategory);
  const categorySeo = getBlogCategorySeo(category as BlogCategory);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Category archive</div>
        <h1>{categorySeo.heading}</h1>
        <p>{categorySeo.introduction}</p>
      </section>

      <section className="section">
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} sourcePage={`blog_category_${category}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
