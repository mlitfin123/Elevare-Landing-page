import { TrackedLink } from "@/components/TrackedLink";
import { formatDate, type BlogPostSummary } from "@/lib/blog";

type BlogCardProps = {
  post: BlogPostSummary;
  sourcePage?: string;
};

export function BlogCard({ post, sourcePage = "blog_index" }: BlogCardProps) {
  return (
    <article className="blog-card">
      <div className="blog-card-top">
        <span className="meta-pill">{post.category}</span>
        <span className="meta-pill">{post.product}</span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.description}</p>
      <div className="blog-card-footer">
        <span className="footer-copy">{formatDate(post.date)}</span>
        <TrackedLink
          className="blog-link"
          href={`/blog/${post.slug}`}
          eventName="article_click"
          eventParams={{
            article_slug: post.slug,
            article_title: post.title,
            article_category: post.category,
            article_product: post.product,
            source_page: sourcePage,
          }}
        >
          Read article
        </TrackedLink>
      </div>
    </article>
  );
}
