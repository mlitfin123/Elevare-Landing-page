import { notFound } from "next/navigation";
import { BlogCard } from "@/components/BlogCard";
import {
  BLOG_CATEGORIES,
  getAllCategories,
  getPostsByCategory,
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

  return buildMetadata({
    title: `${category} articles`,
    description: `Browse published ${category} articles across the Elevare ecosystem.`,
    pathname: `/blog/category/${category}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;

  if (!BLOG_CATEGORIES.includes(category as BlogCategory)) {
    notFound();
  }

  const posts = getPostsByCategory(category as BlogCategory);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Category archive</div>
        <h1>{category} articles</h1>
        <p>Published posts in the {category} category, newest first.</p>
      </section>

      <section className="section">
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
