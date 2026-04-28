import Link from "next/link";
import { BlogCard } from "@/components/BlogCard";
import { BLOG_CATEGORIES, getAllCategories, getAllPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Published articles across tracking, nutrition, training, prep, coaching, and product updates.",
  pathname: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Blog</div>
        <h1>Useful writing across tracking, prep, training, and coaching.</h1>
        <p>
          This blog is organized around practical fitness behavior and product thinking, with local MDX content
          that stays fast, static, and easy to grow.
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
