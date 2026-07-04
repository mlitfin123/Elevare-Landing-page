import { BlogCard } from "@/components/BlogCard";
import { TrackedLink } from "@/components/TrackedLink";
import { BLOG_CATEGORIES, getAllCategories, getAllPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Blog",
  description:
    "Articles across training, nutrition, tracking, prep, coaching, and product updates on ElevareFit.",
  pathname: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Blog</div>
        <h1>Articles on training, nutrition, tracking, and performance.</h1>
        <p>
          Explore practical guidance, product updates, and performance-focused articles built to make fitness
          easier to follow.
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
