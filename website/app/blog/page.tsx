import { BlogCard } from "@/components/BlogCard";
import { TrackedLink } from "@/components/TrackedLink";
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
          ecosystem.
        </p>
        <div className="button-row">
          {(categories.length > 0 ? categories : BLOG_CATEGORIES).map((category) => (
            <TrackedLink
              key={category}
              className="button button-secondary"
              href={`/blog/category/${category}`}
              eventName="cta_click"
              eventParams={{
                cta_name: `Category: ${category}`,
                cta_context: "blog_index_category_filter",
              }}
            >
              {category}
            </TrackedLink>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} sourcePage="blog_index" />
          ))}
        </div>
      </section>
    </div>
  );
}
