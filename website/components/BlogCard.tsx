import { TrackedLink } from "@/components/TrackedLink";
import { formatDate, type BlogPostSummary } from "@/lib/blog";

type BlogCardProps = {
  post: BlogPostSummary;
  sourcePage?: string;
  locale?: string;
  readLabel?: string;
  headingLevel?: 2 | 3;
};

export function BlogCard({ post, sourcePage = "blog_index", locale = "en-US", readLabel = "Read article", headingLevel = 2 }: BlogCardProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <article className="blog-card">
      <div className="blog-card-top">
        <span className="meta-pill">{post.category}</span>
        <span className="meta-pill">{post.product}</span>
      </div>
      <Heading>{post.title}</Heading>
      <p>{post.description}</p>
      <div className="blog-card-footer">
        <span className="footer-copy">{formatDate(post.date, locale)}</span>
        <TrackedLink
          className="blog-link"
          href={`/blog/${post.slug}`}
          hrefLang={locale === "en" || locale === "en-US" ? undefined : "en"}
          eventName="article_click"
          eventParams={{
            article_slug: post.slug,
            article_title: post.title,
            article_category: post.category,
            article_product: post.product,
            source_page: sourcePage,
          }}
        >
          {readLabel}
        </TrackedLink>
      </div>
    </article>
  );
}
