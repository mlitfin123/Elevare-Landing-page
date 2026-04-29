import Link from "next/link";
import { BlogCard } from "@/components/BlogCard";
import { BLOG_CATEGORIES, getAllCategories, getAllPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Insights",
  description:
    "Articles and product insights across tracking, nutrition, training, prep, coaching, and product updates.",
  pathname: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Insights</div>
        <h1>Articles on training, coaching, and performance systems.</h1>
        <p>
          Explore practical analysis, product perspective, and performance-focused guidance across the Elevare
          ecosystem. Everything here is built to be useful, specific, and easy to grow over time.
        </p>
        <div className="button-row">
          {(categories.length > 0 ? categories : BLOG_CATEGORIES).map((category) => (
            <Link key={category} className="button button-secondary" href={`/blog/category/${category}`}>
              {category}
            </Link>
          ))}
        </div>
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
